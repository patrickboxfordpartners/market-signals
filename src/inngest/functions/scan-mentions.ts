import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

interface TwitterMention {
  id: string;
  text: string;
  author: { username: string; name: string; followers_count: number };
  created_at: string;
  public_metrics: { like_count: number; retweet_count: number; reply_count: number };
}

interface RedditMention {
  id: string;
  title?: string;
  body: string;
  author: string;
  created_utc: number;
  score: number;
  permalink: string;
}

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  content: string;
}

const TWITTER_BEARER_TOKEN = process.env.VITE_TWITTER_BEARER_TOKEN;
const REDDIT_CLIENT_ID = process.env.VITE_REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.VITE_REDDIT_CLIENT_SECRET;
const NEWS_API_KEY = process.env.VITE_NEWS_API_KEY;

// Common stock ticker regex (handles $TICKER and TICKER formats)
const TICKER_REGEX = /\$?([A-Z]{1,5})(?![a-z])/g;

export const scanMentions = inngest.createFunction(
  {
    id: "scan-mentions",
    name: "Scan social media for ticker mentions",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    // Get active tickers to monitor
    const activeTickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    });

    if (activeTickers.length === 0) {
      return { message: "No active tickers to scan" };
    }

    const tickerSymbols = activeTickers.map(t => t.symbol);

    // Scan Twitter
    const twitterMentions = await step.run("scan-twitter", async () => {
      if (!TWITTER_BEARER_TOKEN) {
        console.warn("Twitter bearer token not configured");
        return [];
      }

      const mentions: TwitterMention[] = [];

      // Twitter API v2 - search recent tweets
      // Rate limit: 450 requests per 15-minute window
      for (const symbol of tickerSymbols) {
        try {
          const query = `$${symbol} OR ${symbol}`;
          const response = await fetch(
            `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name,public_metrics`,
            {
              headers: {
                Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
              },
            }
          );

          if (!response.ok) {
            console.error(`Twitter API error for ${symbol}:`, response.status);
            continue;
          }

          const data = await response.json();
          if (data.data) {
            mentions.push(...data.data);
          }

          // Respect rate limits - add delay between requests
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`Error scanning Twitter for ${symbol}:`, error);
        }
      }

      return mentions;
    });

    // Scan Reddit
    const redditMentions = await step.run("scan-reddit", async () => {
      if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
        console.warn("Reddit credentials not configured");
        return [];
      }

      // Get Reddit OAuth token
      const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!tokenResponse.ok) {
        console.error("Reddit auth failed");
        return [];
      }

      const { access_token } = await tokenResponse.json();
      const mentions: RedditMention[] = [];

      // Search relevant subreddits
      const subreddits = ["stocks", "investing", "wallstreetbets", "StockMarket"];

      for (const subreddit of subreddits) {
        try {
          const response = await fetch(
            `https://oauth.reddit.com/r/${subreddit}/search?q=${tickerSymbols.join(" OR ")}&limit=25&restrict_sr=1&sort=new`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
                "User-Agent": "market-signals/1.0",
              },
            }
          );

          if (!response.ok) continue;

          const data = await response.json();
          if (data.data?.children) {
            mentions.push(...data.data.children.map((child: any) => child.data));
          }

          // Reddit rate limit: 60 requests per minute
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error scanning Reddit r/${subreddit}:`, error);
        }
      }

      return mentions;
    });

    // Scan News
    const newsArticles = await step.run("scan-news", async () => {
      if (!NEWS_API_KEY) {
        console.warn("NewsAPI key not configured");
        return [];
      }

      const articles: NewsArticle[] = [];

      // NewsAPI free tier: 100 requests/day
      // Strategy: Query top 10 most popular tickers to stay within limits
      const popularTickers = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMD', 'COIN', 'PLTR', 'GME'];
      const tickersToQuery = tickerSymbols.filter(s => popularTickers.includes(s)).slice(0, 10);

      // Get last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const fromDate = yesterday.toISOString().split('T')[0];

      for (const symbol of tickersToQuery) {
        try {
          // Search in business/finance sources
          const response = await fetch(
            `https://newsapi.org/v2/everything?` +
            `q=${encodeURIComponent(symbol)}&` +
            `from=${fromDate}&` +
            `language=en&` +
            `sortBy=publishedAt&` +
            `pageSize=5&` +
            `apiKey=${NEWS_API_KEY}`
          );

          if (!response.ok) {
            console.error(`NewsAPI error for ${symbol}:`, response.status);
            continue;
          }

          const data = await response.json();
          if (data.articles) {
            articles.push(...data.articles);
          }

          // Rate limit: ~5 requests per second max
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`Error fetching news for ${symbol}:`, error);
        }
      }

      return articles;
    });

    // Store mentions in database
    const stored = await step.run("store-mentions", async () => {
      const mentionsToStore = [];

      // Process Twitter mentions
      for (const tweet of twitterMentions) {
        const tickers = extractTickers(tweet.text, tickerSymbols);
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          if (!ticker) continue;

          // Check if source exists
          let source = await findOrCreateSource({
            name: tweet.author.name,
            platform: "twitter",
            username: tweet.author.username,
            source_type: "individual",
            follower_count: tweet.author.followers_count,
          });

          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: source.id,
            content: tweet.text,
            url: `https://twitter.com/${tweet.author.username}/status/${tweet.id}`,
            platform: "twitter",
            mentioned_at: tweet.created_at,
            engagement_score:
              tweet.public_metrics.like_count +
              tweet.public_metrics.retweet_count +
              tweet.public_metrics.reply_count,
          });
        }
      }

      // Process Reddit mentions
      for (const post of redditMentions) {
        const tickers = extractTickers(post.body || post.title || "", tickerSymbols);
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          if (!ticker) continue;

          let source = await findOrCreateSource({
            name: post.author,
            platform: "reddit",
            username: post.author,
            source_type: "individual",
          });

          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: source.id,
            content: post.body || post.title || "",
            url: `https://reddit.com${post.permalink}`,
            platform: "reddit",
            mentioned_at: new Date(post.created_utc * 1000).toISOString(),
            engagement_score: post.score,
          });
        }
      }

      // Process News articles
      for (const article of newsArticles) {
        const tickers = extractTickers(
          `${article.title} ${article.description || ""} ${article.content || ""}`,
          tickerSymbols
        );
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          if (!ticker) continue;

          let source = await findOrCreateSource({
            name: article.source.name,
            platform: "news",
            username: article.source.name,
            source_type: "publication",
            follower_count: 0,
          });

          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: source.id,
            content: `${article.title}. ${article.description || ""}`,
            url: article.url,
            platform: "news",
            mentioned_at: article.publishedAt,
            engagement_score: 0, // News articles don't have engagement metrics
          });
        }
      }

      // Bulk insert (Supabase handles duplicates if we add unique constraint)
      if (mentionsToStore.length > 0) {
        const { error } = await supabase.from("mentions").insert(mentionsToStore);

        if (error) {
          console.error("Error storing mentions:", error);
          return { stored: 0 };
        }

        return { stored: mentionsToStore.length };
      }

      return { stored: 0 };
    });

    return {
      tickers_scanned: tickerSymbols.length,
      twitter_mentions: twitterMentions.length,
      reddit_mentions: redditMentions.length,
      news_articles: newsArticles.length,
      stored: stored.stored,
    };
  }
);

// Helper: Extract ticker symbols from text
function extractTickers(text: string, validSymbols: string[]): string[] {
  const matches = text.match(TICKER_REGEX);
  if (!matches) return [];

  const found = matches.map(m => m.replace("$", "").toUpperCase());
  return [...new Set(found)].filter(symbol => validSymbols.includes(symbol));
}

// Helper: Find or create source
async function findOrCreateSource(sourceData: {
  name: string;
  platform: string;
  username: string;
  source_type: string;
  follower_count?: number;
}) {
  // Check if source exists
  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("platform", sourceData.platform)
    .eq("username", sourceData.username)
    .single();

  if (existing) {
    return existing;
  }

  // Create new source
  const { data: created, error } = await supabase
    .from("sources")
    .insert({
      name: sourceData.name,
      platform: sourceData.platform,
      username: sourceData.username,
      source_type: sourceData.source_type,
      follower_count: sourceData.follower_count || 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created;
}
