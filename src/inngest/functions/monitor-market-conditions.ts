import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

interface MarketCondition {
  ticker_id: string;
  symbol: string;
  volume_spike: boolean;
  sentiment_shift: boolean;
  mention_pattern_unusual: boolean;
  severity: "low" | "medium" | "high";
  details: {
    volume_change?: number;
    sentiment_change?: number;
    mention_velocity?: number;
  };
}

export const monitorMarketConditions = inngest.createFunction(
  {
    id: "monitor-market-conditions",
    name: "Monitor market conditions for volume spikes and sentiment shifts",
    triggers: [{ cron: "*/15 * * * *" }] // Every 15 minutes
  },
  async ({ step }) => {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get active tickers with recent activity
    const activeTickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol, avg_daily_mentions")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    });

    // Analyze each ticker for unusual conditions
    const conditions: MarketCondition[] = [];

    for (const ticker of activeTickers) {
      const condition = await step.run(`analyze-${ticker.symbol}`, async () => {
        // Check mention velocity (mentions in last 15 min vs typical)
        const { count: recentMentions } = await supabase
          .from("mentions")
          .select("*", { count: "exact", head: true })
          .eq("ticker_id", ticker.id)
          .gte("mentioned_at", fifteenMinutesAgo.toISOString());

        // Expected mentions in 15 min window = (avg_daily_mentions / 96)
        const expectedMentions = ticker.avg_daily_mentions / 96;
        const mentionVelocity = (recentMentions || 0) / (expectedMentions || 1);

        // Check sentiment shift (last hour vs last 24 hours)
        const { data: recentPredictions } = await supabase
          .from("predictions")
          .select("sentiment")
          .eq("ticker_id", ticker.id)
          .gte("prediction_date", oneHourAgo.toISOString());

        const { data: historicalPredictions } = await supabase
          .from("predictions")
          .select("sentiment")
          .eq("ticker_id", ticker.id)
          .gte("prediction_date", yesterday.toISOString())
          .lt("prediction_date", oneHourAgo.toISOString());

        const calculateBullishRatio = (preds: any[]) => {
          if (!preds || preds.length === 0) return 0;
          const bullish = preds.filter(p => p.sentiment === "bullish").length;
          return bullish / preds.length;
        };

        const recentBullishRatio = calculateBullishRatio(recentPredictions || []);
        const historicalBullishRatio = calculateBullishRatio(historicalPredictions || []);
        const sentimentChange = Math.abs(recentBullishRatio - historicalBullishRatio);

        // Detect unusual patterns
        const volumeSpike = mentionVelocity > 3.0;
        const sentimentShift = sentimentChange > 0.3 && (recentPredictions?.length || 0) >= 3;
        const mentionPatternUnusual = mentionVelocity > 2.0 && mentionVelocity < 10.0;

        // Calculate severity
        let severity: "low" | "medium" | "high" = "low";
        if (volumeSpike && sentimentShift) {
          severity = "high";
        } else if (volumeSpike || sentimentShift) {
          severity = "medium";
        }

        const isUnusual = volumeSpike || sentimentShift || mentionPatternUnusual;

        return isUnusual ? {
          ticker_id: ticker.id,
          symbol: ticker.symbol,
          volume_spike: volumeSpike,
          sentiment_shift: sentimentShift,
          mention_pattern_unusual: mentionPatternUnusual,
          severity,
          details: {
            volume_change: mentionVelocity,
            sentiment_change: sentimentChange,
            mention_velocity: mentionVelocity
          }
        } : null;
      });

      if (condition) {
        conditions.push(condition);
      }
    }

    // Trigger multi-signal alert generation for high severity conditions
    const highSeverityConditions = conditions.filter(c => c.severity === "high");

    if (highSeverityConditions.length > 0) {
      await step.sendEvent("trigger-multi-signal-alerts", {
        name: "market/conditions-detected",
        data: {
          conditions: highSeverityConditions,
          timestamp: now.toISOString()
        }
      });
    }

    return {
      tickers_analyzed: activeTickers.length,
      conditions_detected: conditions.length,
      high_severity: highSeverityConditions.length,
      conditions: conditions.map(c => ({
        symbol: c.symbol,
        severity: c.severity,
        volume_spike: c.volume_spike,
        sentiment_shift: c.sentiment_shift
      }))
    };
  }
);
