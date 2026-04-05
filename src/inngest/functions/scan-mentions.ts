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

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Require $ prefix OR match against known symbols list to avoid false positives
// Words like ALL, ON, IT, NOW etc. will only match with $ prefix
const CASHTAG_REGEX = /\$([A-Z]{1,5})(?![a-z])/g;

// Common English words that are also tickers — require $ prefix for these
const AMBIGUOUS_TICKERS = new Set([
  "A", "I", "IT", "ALL", "FOR", "NOW", "ON", "AT", "DO", "GO", "SO",
  "AN", "ARE", "BE", "CAN", "HAS", "HE", "HIM", "HIS", "HOW", "IF",
  "IS", "MAN", "NEW", "OLD", "ONE", "OR", "OUT", "RUN", "SAY", "SHE",
  "TWO", "WAR", "BIG", "LOW", "ODD", "ANY", "SEE", "WELL", "GOOD",
  "BEST", "FAST", "REAL", "PLAY", "OPEN", "TURN", "PEAK", "TRUE",
]);

export const scanMentions = inngest.createFunction(
  { id: "scan-mentions", name: "Scan social media for ticker mentions" },
  { cron: "*/15 * * * *" },
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

      const subreddits = ["stocks", "investing", "wallstreetbets", "StockMarket"];

      // Chunk ticker symbols to avoid exceeding URL length limits
      const chunkSize = 15;
      const tickerChunks = [];
      for (let i = 0; i < tickerSymbols.length; i += chunkSize) {
        tickerChunks.push(tickerSymbols.slice(i, i + chunkSize));
      }

      for (const subreddit of subreddits) {
        for (const chunk of tickerChunks) {
          try {
            const response = await fetch(
              `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(chunk.join(" OR "))}&limit=25&restrict_sr=1&sort=new`,
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

            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error scanning Reddit r/${subreddit}:`, error);
          }
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

      const popularTickers = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMD', 'COIN', 'PLTR', 'GME'];
      const tickersToQuery = tickerSymbols.filter(s => popularTickers.includes(s)).slice(0, 10);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const fromDate = yesterday.toISOString().split('T')[0];

      for (const symbol of tickersToQuery) {
        try {
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

          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`Error fetching news for ${symbol}:`, error);
        }
      }

      return articles;
    });

    // Store mentions in database
    const stored = await step.run("store-mentions", async () => {
      const mentionsToStore: Array<{
        ticker_id: string;
        source_id: string;
        content: string;
        url: string;
        platform: string;
        mentioned_at: string;
        engagement_score: number;
      }> = [];

      // Batch resolve all sources upfront instead of N+1 queries
      const sourceKeys = new Set<string>();

      for (const tweet of twitterMentions) {
        sourceKeys.add(`twitter:${tweet.author.username}`);
      }
      for (const post of redditMentions) {
        sourceKeys.add(`reddit:${post.author}`);
      }
      for (const article of newsArticles) {
        sourceKeys.add(`news:${article.source.name}`);
      }

      // Fetch all existing sources in one query
      const platformUsernames = [...sourceKeys].map(k => {
        const [platform, username] = k.split(":", 2);
        return { platform, username };
      });

      const sourceMap = new Map<string, string>();

      if (platformUsernames.length > 0) {
        // Fetch existing sources
        const { data: existingSources } = await supabase
          .from("sources")
          .select("id, platform, username")
          .in("platform", [...new Set(platformUsernames.map(s => s.platform))])
          .in("username", [...new Set(platformUsernames.map(s => s.username))]);

        for (const source of existingSources || []) {
          sourceMap.set(`${source.platform}:${source.username}`, source.id);
        }

        // Create missing sources in bulk
        const missingSources = platformUsernames.filter(
          s => !sourceMap.has(`${s.platform}:${s.username}`)
        );

        if (missingSources.length > 0) {
          const sourceRecords = missingSources.map(s => {
            // Find the original data to get name/follower_count
            let name = s.username;
            let sourceType = "individual";
            let followerCount = 0;

            if (s.platform === "twitter") {
              const tweet = twitterMentions.find(t => t.author.username === s.username);
              if (tweet) {
                name = tweet.author.name;
                followerCount = tweet.author.followers_count;
              }
            } else if (s.platform === "news") {
              sourceType = "publication";
            }

            return {
              name,
              platform: s.platform,
              username: s.username,
              source_type: sourceType,
              follower_count: followerCount,
            };
          });

          const { data: created } = await supabase
            .from("sources")
            .upsert(sourceRecords, { onConflict: "platform,username" })
            .select("id, platform, username");

          for (const source of created || []) {
            sourceMap.set(`${source.platform}:${source.username}`, source.id);
          }
        }
      }

      // Process Twitter mentions
      for (const tweet of twitterMentions) {
        const tickers = extractTickers(tweet.text, tickerSymbols);
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          const sourceId = sourceMap.get(`twitter:${tweet.author.username}`);
          if (!ticker || !sourceId) continue;

          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
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
          const sourceId = sourceMap.get(`reddit:${post.author}`);
          if (!ticker || !sourceId) continue;

          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
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
          const sourceId = sourceMap.get(`news:${article.source.name}`);
          if (!ticker || !sourceId) continue;

          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
            content: `${article.title}. ${article.description || ""}`,
            url: article.url,
            platform: "news",
            mentioned_at: article.publishedAt,
            engagement_score: 0,
          });
        }
      }

      // Upsert to handle duplicates (same ticker + platform + url)
      if (mentionsToStore.length > 0) {
        const { error } = await supabase
          .from("mentions")
          .upsert(mentionsToStore, {
            onConflict: "ticker_id,platform,url",
            ignoreDuplicates: true,
          });

        if (error) {
          console.error("Error storing mentions:", error);
          return { stored: 0 };
        }

        return { stored: mentionsToStore.length };
      }

      return { stored: 0 };
    });

    // Log scan results for gap detection
    await step.run("log-scan-results", async () => {
      const logs = [
        {
          scan_type: "twitter",
          status: !TWITTER_BEARER_TOKEN ? "skipped" : twitterMentions.length > 0 ? "success" : "success",
          mentions_found: twitterMentions.length,
          error_message: !TWITTER_BEARER_TOKEN ? "Bearer token not configured" : null,
          completed_at: new Date().toISOString(),
        },
        {
          scan_type: "reddit",
          status: !REDDIT_CLIENT_ID ? "skipped" : redditMentions.length >= 0 ? "success" : "error",
          mentions_found: redditMentions.length,
          error_message: !REDDIT_CLIENT_ID ? "Reddit credentials not configured" : null,
          completed_at: new Date().toISOString(),
        },
        {
          scan_type: "news",
          status: !NEWS_API_KEY ? "skipped" : newsArticles.length >= 0 ? "success" : "error",
          mentions_found: newsArticles.length,
          error_message: !NEWS_API_KEY ? "NewsAPI key not configured" : null,
          completed_at: new Date().toISOString(),
        },
      ];

      await supabase.from("scan_log").insert(logs);
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
// Uses cashtag ($TICKER) for unambiguous matching, falls back to plain uppercase
// only for non-ambiguous symbols
function extractTickers(text: string, validSymbols: string[]): string[] {
  const found = new Set<string>();

  // First pass: cashtag matches (always trusted)
  let match;
  while ((match = CASHTAG_REGEX.exec(text)) !== null) {
    const symbol = match[1].toUpperCase();
    if (validSymbols.includes(symbol)) {
      found.add(symbol);
    }
  }
  CASHTAG_REGEX.lastIndex = 0;

  // Second pass: plain uppercase words, but skip ambiguous ones
  const wordRegex = /\b([A-Z]{2,5})\b/g;
  while ((match = wordRegex.exec(text)) !== null) {
    const symbol = match[1];
    if (validSymbols.includes(symbol) && !AMBIGUOUS_TICKERS.has(symbol)) {
      found.add(symbol);
    }
  }

  return [...found];
}
