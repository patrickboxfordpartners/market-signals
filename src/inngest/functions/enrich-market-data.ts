import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

interface MarketData {
  symbol: string;
  volume: number;
  avg_volume: number;
  volume_ratio: number;
  price: number;
  price_change_percent: number;
  market_cap?: number;
}

interface NewsItem {
  title: string;
  url: string;
  time_published: string;
  overall_sentiment_score: number;
  ticker_sentiment: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
  }>;
}

async function fetchMarketOverview(symbol: string): Promise<MarketData | null> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn("Alpha Vantage API key not configured");
    return null;
  }

  try {
    // Fetch daily time series — includes 20-day history to compute avg volume
    const dailyUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const dailyResponse = await fetch(dailyUrl);
    const dailyData = await dailyResponse.json();

    const timeSeries: Record<string, Record<string, string>> = dailyData["Time Series (Daily)"] || {};
    const dates = Object.keys(timeSeries).sort().reverse(); // most recent first

    if (dates.length === 0) return null;

    const latest = timeSeries[dates[0]];
    const currentVolume = parseInt(latest["5. volume"] || "0");
    const currentPrice = parseFloat(latest["4. close"] || "0");
    const prevPrice = dates[1] ? parseFloat(timeSeries[dates[1]]["4. close"] || "0") : currentPrice;
    const priceChangePct = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;

    // 20-day average volume
    const volumeSample = dates.slice(0, 20).map(d => parseInt(timeSeries[d]["5. volume"] || "0"));
    const avgVolume = volumeSample.length > 0
      ? Math.round(volumeSample.reduce((a, b) => a + b, 0) / volumeSample.length)
      : 0;

    return {
      symbol,
      volume: currentVolume,
      avg_volume: avgVolume,
      volume_ratio: avgVolume > 0 ? currentVolume / avgVolume : 0,
      price: currentPrice,
      price_change_percent: priceChangePct,
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    return null;
  }
}

async function fetchNewsAndSentiment(symbols: string[]): Promise<Record<string, NewsItem[]>> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn("Alpha Vantage API key not configured");
    return {};
  }

  try {
    // Alpha Vantage News & Sentiment API
    const tickers = symbols.join(",");
    const newsUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickers}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const newsResponse = await fetch(newsUrl);
    const newsData = await newsResponse.json();

    if (newsData.feed) {
      const newsBySymbol: Record<string, NewsItem[]> = {};

      for (const symbol of symbols) {
        newsBySymbol[symbol] = [];
      }

      for (const item of newsData.feed) {
        // Map news to relevant tickers
        if (item.ticker_sentiment) {
          for (const tickerSentiment of item.ticker_sentiment) {
            const symbol = tickerSentiment.ticker;
            if (newsBySymbol[symbol]) {
              newsBySymbol[symbol].push({
                title: item.title,
                url: item.url,
                time_published: item.time_published,
                overall_sentiment_score: parseFloat(item.overall_sentiment_score || "0"),
                ticker_sentiment: item.ticker_sentiment
              });
            }
          }
        }
      }

      return newsBySymbol;
    }

    return {};
  } catch (error) {
    console.error("Error fetching news sentiment:", error);
    return {};
  }
}

export const enrichMarketData = inngest.createFunction(
  {
    id: "enrich-market-data",
    name: "Enrich ticker data with additional market information",
    triggers: [{ cron: "0 */4 * * *" }] // Every 4 hours
  },
  async ({ step }) => {
    // Get active tickers that need enrichment
    const tickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol, market_cap")
        .eq("is_active", true)
        .limit(20); // Process 20 at a time to respect API limits

      if (error) throw error;
      return data || [];
    });

    if (tickers.length === 0) {
      return { status: "skipped", reason: "No active tickers to enrich" };
    }

    const symbols = tickers.map(t => t.symbol);

    // Fetch market data for each ticker (respecting rate limits)
    const marketData: Record<string, MarketData> = {};

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];

      const data = await step.run(`fetch-market-data-${symbol}`, async () => {
        const data = await fetchMarketOverview(symbol);

        // Rate limit: 5 requests per minute
        if (i < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 12500));
        }

        return data;
      });

      if (data) {
        marketData[symbol] = data;
      }
    }

    // Fetch news and sentiment for all tickers (single API call)
    const newsData = await step.run("fetch-news-sentiment", async () => {
      return await fetchNewsAndSentiment(symbols);
    });

    // Correlate news sentiment with our internal mention data
    const correlations = await step.run("correlate-data", async () => {
      const results = [];

      for (const ticker of tickers) {
        const market = marketData[ticker.symbol];
        const news = newsData[ticker.symbol] || [];

        if (!market && news.length === 0) continue;

        // Get recent mention count
        const { count: recentMentions } = await supabase
          .from("mentions")
          .select("*", { count: "exact", head: true })
          .eq("ticker_id", ticker.id)
          .gte("mentioned_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Calculate correlation metrics
        const hasVolumeSpike = market && market.avg_volume > 0 && market.volume_ratio >= 1.5;
        const hasPriceMove = market && Math.abs(market.price_change_percent) > 2;
        const hasNewsActivity = news.length > 5;
        const hasMentionActivity = (recentMentions || 0) > ticker.avg_daily_mentions * 1.3;

        // Calculate average news sentiment
        const avgNewsSentiment = news.length > 0
          ? news.reduce((sum, item) => sum + item.overall_sentiment_score, 0) / news.length
          : 0;

        results.push({
          ticker_id: ticker.id,
          symbol: ticker.symbol,
          market_data: market,
          news_count: news.length,
          avg_news_sentiment: avgNewsSentiment,
          correlation_signals: {
            volume_spike: hasVolumeSpike,
            price_movement: hasPriceMove,
            news_activity: hasNewsActivity,
            mention_activity: hasMentionActivity
          },
          alignment_score: [
            hasVolumeSpike,
            hasPriceMove,
            hasNewsActivity,
            hasMentionActivity
          ].filter(Boolean).length
        });

        // Store enriched data
        if (market) {
          await supabase
            .from("tickers")
            .update({
              market_cap: market.market_cap,
              updated_at: new Date().toISOString()
            })
            .eq("id", ticker.id);
        }
      }

      return results;
    });

    // Identify high-correlation opportunities
    const highCorrelation = correlations.filter(c => c.alignment_score >= 3);

    // Trigger market monitoring for high-correlation tickers
    if (highCorrelation.length > 0) {
      await step.sendEvent("trigger-enhanced-monitoring", {
        name: "market/high-correlation-detected",
        data: {
          tickers: highCorrelation.map(c => ({
            symbol: c.symbol,
            alignment_score: c.alignment_score,
            signals: c.correlation_signals
          }))
        }
      });
    }

    // Tag unvalidated predictions with earnings window proximity using FMP earnings calendar
    const earningsTagged = await step.run("tag-earnings-window", async () => {
      const FMP_API_KEY = process.env.FMP_API_KEY;
      if (!FMP_API_KEY || FMP_API_KEY === "demo") return { tagged: 0 };

      let tagged = 0;
      const today = new Date();
      const windowDays = 14;

      for (const ticker of tickers) {
        try {
          const from = new Date(today); from.setDate(from.getDate() - windowDays);
          const to = new Date(today); to.setDate(to.getDate() + windowDays);
          const fromStr = from.toISOString().split("T")[0];
          const toStr = to.toISOString().split("T")[0];

          const res = await fetch(
            `https://financialmodelingprep.com/api/v3/historical/earning_calendar/${ticker.symbol}?from=${fromStr}&to=${toStr}&apikey=${FMP_API_KEY}`
          );
          if (!res.ok) continue;

          const events: Array<{ date: string }> = await res.json();
          if (!events || events.length === 0) {
            await new Promise(r => setTimeout(r, 300));
            continue;
          }

          const earningsDate = events[0].date;

          // Tag recent unvalidated predictions for this ticker
          const { error } = await supabase
            .from("predictions")
            .update({ earnings_window: true, earnings_date: earningsDate })
            .eq("ticker_id", ticker.id)
            .is("earnings_window", null)
            .gte("prediction_date", from.toISOString());

          if (!error) tagged++;
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          console.error(`Earnings tag error for ${ticker.symbol}:`, err);
        }
      }

      return { tagged };
    });

    return {
      tickers_processed: tickers.length,
      market_data_fetched: Object.keys(marketData).length,
      news_items_fetched: Object.values(newsData).reduce((sum, items) => sum + items.length, 0),
      high_correlation_detected: highCorrelation.length,
      earnings_tagged: earningsTagged.tagged,
      opportunities: highCorrelation.map(c => ({
        symbol: c.symbol,
        alignment_score: c.alignment_score,
        news_count: c.news_count,
        avg_sentiment: c.avg_news_sentiment.toFixed(2)
      }))
    };
  }
);
