import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

export const detectSpikes = inngest.createFunction(
  { id: "detect-spikes", name: "Detect mention frequency spikes" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const today = new Date().toISOString().split("T")[0];

    // Get active tickers
    const activeTickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol, avg_daily_mentions, mention_spike_threshold")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    });

    // Aggregate today's mentions for each ticker
    const aggregated = await step.run("aggregate-mentions", async () => {
      const results = [];

      for (const ticker of activeTickers) {
        // Count today's mentions
        const { count, error } = await supabase
          .from("mentions")
          .select("*", { count: "exact", head: true })
          .eq("ticker_id", ticker.id)
          .gte("mentioned_at", `${today}T00:00:00Z`)
          .lt("mentioned_at", `${today}T23:59:59Z`);

        if (error) {
          console.error(`Error counting mentions for ${ticker.symbol}:`, error);
          continue;
        }

        // Count unique sources
        const { data: uniqueSources } = await supabase
          .from("mentions")
          .select("source_id")
          .eq("ticker_id", ticker.id)
          .gte("mentioned_at", `${today}T00:00:00Z`)
          .lt("mentioned_at", `${today}T23:59:59Z`);

        const uniqueSourceCount = new Set(
          uniqueSources?.map(s => s.source_id).filter(Boolean)
        ).size;

        // Calculate average sentiment (placeholder - will implement after sentiment extraction)
        const avgSentiment = 0;

        // Detect spike
        const mentionCount = count || 0;
        const spikeDetected =
          mentionCount > ticker.avg_daily_mentions &&
          mentionCount >= ticker.mention_spike_threshold;

        results.push({
          ticker,
          mentionCount,
          uniqueSourceCount,
          avgSentiment,
          spikeDetected,
        });
      }

      return results;
    });

    // Store in mention_frequency table
    const stored = await step.run("store-frequency-data", async () => {
      const records = aggregated.map(agg => ({
        ticker_id: agg.ticker.id,
        date: today,
        mention_count: agg.mentionCount,
        unique_sources: agg.uniqueSourceCount,
        avg_sentiment_score: agg.avgSentiment,
        spike_detected: agg.spikeDetected,
      }));

      const { error } = await supabase
        .from("mention_frequency")
        .upsert(records, { onConflict: "ticker_id,date" });

      if (error) {
        console.error("Error storing frequency data:", error);
        return { stored: 0 };
      }

      return { stored: records.length };
    });

    // Update rolling averages for tickers
    await step.run("update-rolling-averages", async () => {
      for (const ticker of activeTickers) {
        // Calculate 30-day rolling average
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: history } = await supabase
          .from("mention_frequency")
          .select("mention_count")
          .eq("ticker_id", ticker.id)
          .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

        if (history && history.length > 0) {
          const avg = Math.round(
            history.reduce((sum, h) => sum + h.mention_count, 0) / history.length
          );

          await supabase
            .from("tickers")
            .update({ avg_daily_mentions: avg })
            .eq("id", ticker.id);
        }
      }
    });

    const spikes = aggregated.filter(a => a.spikeDetected);

    // Trigger prediction extraction for spiking tickers
    if (spikes.length > 0) {
      await step.sendEvent("trigger-extraction", {
        name: "extract/predictions",
        data: {
          ticker_ids: spikes.map(s => s.ticker.id),
          reason: "spike_detected",
        },
      });
    }

    return {
      tickers_analyzed: activeTickers.length,
      spikes_detected: spikes.length,
      spikes: spikes.map(s => ({
        symbol: s.ticker.symbol,
        mentions: s.mentionCount,
        avg: s.ticker.avg_daily_mentions,
      })),
      stored: stored.stored,
    };
  }
);
