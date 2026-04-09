import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

interface PredictionEvent {
  prediction_ids: string[];
  ticker_symbols: string[];
}

export const sendPredictionAlerts = inngest.createFunction(
  {
    id: "send-prediction-alerts",
    name: "Send alerts for high-confidence predictions",
    triggers: [{ event: "predictions/high-confidence" }]
  },
  async ({ event, step }) => {
    const { prediction_ids, ticker_symbols } = event.data as PredictionEvent;

    if (!prediction_ids || prediction_ids.length === 0) {
      return { status: "skipped", reason: "No predictions to alert" };
    }

    // Get alert preferences for users who have prediction alerts enabled
    const alertPrefs = await step.run("fetch-alert-preferences", async () => {
      const { data, error } = await supabase
        .from("alert_preferences")
        .select("*")
        .eq("prediction_alerts_enabled", true);

      if (error) throw error;
      return data || [];
    });

    if (alertPrefs.length === 0) {
      return { status: "skipped", reason: "No users with prediction alerts enabled" };
    }

    // Get prediction details with related data
    const predictionData = await step.run("fetch-prediction-details", async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(`
          *,
          tickers(symbol, company_name),
          sources(name, platform)
        `)
        .in("id", prediction_ids)
        .order("confidence_level", { ascending: false });

      if (error) throw error;
      return data || [];
    });

    // Send alerts to each user
    let alertsSent = 0;

    for (const pref of alertPrefs) {
      // Filter predictions by user's confidence threshold
      const relevantPredictions = predictionData.filter((p: any) => {
        const confidenceMap = { low: 30, medium: 60, high: 80 };
        const predictionScore = confidenceMap[p.confidence_level as keyof typeof confidenceMap] || 50;
        return predictionScore >= (pref.prediction_confidence_threshold || 70);
      });

      if (relevantPredictions.length === 0) continue;

      const subject = `🎯 ${relevantPredictions.length} High-Confidence Prediction${relevantPredictions.length > 1 ? 's' : ''}`;
      const message = relevantPredictions
        .map((p: any) => {
          const ticker = p.tickers as any;
          const source = p.sources as any;
          const direction = p.sentiment === "bullish" ? "📈" : p.sentiment === "bearish" ? "📉" : "➡️";
          const target = p.price_target ? ` → $${p.price_target}` : "";
          const timeframe = p.timeframe_days ? ` (${p.timeframe_days}d)` : "";
          return `${direction} ${ticker?.symbol || 'Unknown'}${target}${timeframe} - ${p.confidence_level?.toUpperCase()} confidence\nSource: ${source?.name || 'Unknown'} (${source?.platform || ''})`;
        })
        .join('\n\n');

      await step.run(`send-alert-${pref.user_id}`, async () => {
        // Log the alert
        const { error: logError } = await supabase.from("alert_log").insert({
          alert_type: "prediction",
          user_id: pref.user_id,
          ticker_symbol: ticker_symbols.join(", "),
          subject,
          message,
          metadata: {
            prediction_ids,
            prediction_count: relevantPredictions.length,
          },
          status: "pending",
          delivery_channel: pref.email_enabled ? "email" : "webhook",
        });

        if (logError) {
          console.error("Failed to log alert:", logError);
          return;
        }

        // TODO: Actual email/webhook delivery would go here
        // For now, just mark as sent
        // await sendEmail(pref.email_address, subject, message)
        // await sendWebhook(pref.webhook_url, { subject, message })

        console.log(`Alert logged for user ${pref.user_id}: ${subject}`);
        alertsSent++;
      });
    }

    return {
      status: "completed",
      predictions_alerted: prediction_ids.length,
      alerts_sent: alertsSent,
    };
  }
);
