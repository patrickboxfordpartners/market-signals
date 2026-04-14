import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { sendEmail, sendWebhook } from "../../lib/email.js";

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

interface MultiSignalEvent {
  conditions: MarketCondition[];
  timestamp: string;
}

export const generateMultiSignalAlerts = inngest.createFunction(
  {
    id: "generate-multi-signal-alerts",
    name: "Generate alerts based on multi-signal correlation",
    triggers: [{ event: "market/conditions-detected" }]
  },
  async ({ event, step }) => {
    const { conditions, timestamp } = event.data as MultiSignalEvent;

    if (!conditions || conditions.length === 0) {
      return { status: "skipped", reason: "No conditions to alert on" };
    }

    // Get alert preferences for users who have advanced alerts enabled
    const alertPrefs = await step.run("fetch-alert-preferences", async () => {
      const { data, error } = await supabase
        .from("alert_preferences")
        .select("*")
        .or("spike_alerts_enabled.eq.true,prediction_alerts_enabled.eq.true");

      if (error) throw error;
      return data || [];
    });

    if (alertPrefs.length === 0) {
      return { status: "skipped", reason: "No users with alerts enabled" };
    }

    // Enrich conditions with additional market data
    const enrichedConditions = await step.run("enrich-conditions", async () => {
      const enriched = [];

      for (const condition of conditions) {
        // Get recent high-credibility predictions
        const { data: predictions } = await supabase
          .from("predictions")
          .select(`
            *,
            sources!inner(
              name,
              credibility_score,
              accuracy_rate
            )
          `)
          .eq("ticker_id", condition.ticker_id)
          .gte("prediction_date", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .gte("sources.credibility_score", 60)
          .order("sources.credibility_score", { ascending: false })
          .limit(5);

        // Get mention spike data
        const { data: spikeData } = await supabase
          .from("mention_frequency")
          .select("*")
          .eq("ticker_id", condition.ticker_id)
          .order("date", { ascending: false })
          .limit(7);

        enriched.push({
          ...condition,
          top_predictions: predictions || [],
          spike_history: spikeData || []
        });
      }

      return enriched;
    });

    // Generate alert messages with correlation analysis
    let alertsSent = 0;

    for (const pref of alertPrefs) {
      // Filter conditions by user's watched tickers (if any)
      const relevantConditions = enrichedConditions;

      if (relevantConditions.length === 0) continue;

      for (const condition of relevantConditions) {
        const signals = [];
        if (condition.volume_spike) signals.push("volume spike");
        if (condition.sentiment_shift) signals.push("sentiment shift");
        if (condition.mention_pattern_unusual) signals.push("unusual mention pattern");

        const subject = `⚠️ Multi-Signal Alert: ${condition.symbol} (${condition.severity.toUpperCase()})`;

        const topPredictors = condition.top_predictions
          .slice(0, 3)
          .map((p: any) => `• ${p.sources.name} (${p.sources.accuracy_rate}% accurate): ${p.sentiment}`)
          .join("\n");

        const message = `
${condition.symbol} showing ${signals.join(" + ")}

Severity: ${condition.severity.toUpperCase()}

Details:
• Mention velocity: ${condition.details.mention_velocity?.toFixed(1)}x normal
• Sentiment change: ${((condition.details.sentiment_change || 0) * 100).toFixed(1)}%

Top credible sources (24h):
${topPredictors || "No recent predictions from credible sources"}

This is a correlated signal - multiple indicators are aligning.
        `.trim();

        await step.run(`send-alert-${pref.user_id}-${condition.symbol}`, async () => {
          let deliveryStatus = "pending";
          let deliveryError: string | null = null;
          let deliveryChannel: string | null = null;

          // Try email first if enabled
          if (pref.email_enabled && pref.email_address) {
            deliveryChannel = "email";
            const result = await sendEmail({
              to: pref.email_address,
              subject,
              text: message,
            });

            if (result.success) {
              deliveryStatus = "sent";
            } else {
              deliveryStatus = "failed";
              deliveryError = result.error || null;
            }
          }
          // Otherwise try webhook
          else if (pref.webhook_enabled && pref.webhook_url) {
            deliveryChannel = "webhook";
            const result = await sendWebhook(pref.webhook_url, {
              type: "multi_signal",
              subject,
              message,
              condition,
            });

            if (result.success) {
              deliveryStatus = "sent";
            } else {
              deliveryStatus = "failed";
              deliveryError = result.error || null;
            }
          }

          // Log the alert
          const { error: logError } = await supabase.from("alert_log").insert({
            alert_type: "multi_signal",
            user_id: pref.user_id,
            ticker_symbol: condition.symbol,
            subject,
            message,
            metadata: {
              signals,
              severity: condition.severity,
              details: condition.details,
            },
            status: deliveryStatus,
            delivery_channel: deliveryChannel,
            error_message: deliveryError,
            sent_at: deliveryStatus === "sent" ? new Date().toISOString() : null,
          });

          if (logError) {
            console.error("Failed to log alert:", logError);
            return;
          }

          if (deliveryStatus === "sent") {
            alertsSent++;
          }
        });
      }
    }

    return {
      status: "completed",
      conditions_processed: conditions.length,
      alerts_sent: alertsSent,
    };
  }
);
