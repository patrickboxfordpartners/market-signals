import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { sendEmail, sendWebhook, sendTelegram, sendDiscord } from "../../lib/email.js";

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
            type: "prediction",
            subject,
            message,
            predictions: relevantPredictions,
          });

          if (result.success) {
            deliveryStatus = "sent";
          } else {
            deliveryStatus = "failed";
            deliveryError = result.error || null;
          }
        }
        else if ((pref as any).telegram_enabled && (pref as any).telegram_chat_id) {
          deliveryChannel = "telegram";
          const result = await sendTelegram(
            (pref as any).telegram_chat_id,
            `*${subject}*\n\n${message}`
          );
          deliveryStatus = result.success ? "sent" : "failed";
          deliveryError = result.error || null;
        }
        else if ((pref as any).discord_enabled && (pref as any).discord_webhook_url) {
          deliveryChannel = "discord";
          const result = await sendDiscord(
            (pref as any).discord_webhook_url,
            `**${subject}**\n\`\`\`\n${message}\n\`\`\``
          );
          deliveryStatus = result.success ? "sent" : "failed";
          deliveryError = result.error || null;
        }

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

    // Also alert users who follow the source that made these predictions
    const followAlertsSent = await step.run("send-follow-alerts", async () => {
      const sourceIds = [...new Set(predictionData.map((p: any) => p.source_id).filter(Boolean))];
      if (sourceIds.length === 0) return 0;

      const { data: followers } = await supabase
        .from("source_follows")
        .select("user_id, source_id, auth_users:user_id(email)")
        .in("source_id", sourceIds);

      if (!followers || followers.length === 0) return 0;

      let sent = 0;
      for (const follow of followers) {
        const sourcePreds = predictionData.filter((p: any) => p.source_id === follow.source_id);
        if (sourcePreds.length === 0) continue;

        const source = (sourcePreds[0] as any).sources as any;
        const subject = `Followed source alert: ${source?.name || "Unknown"} made ${sourcePreds.length} new prediction(s)`;
        const message = sourcePreds.map((p: any) => {
          const ticker = p.tickers as any;
          return `${ticker?.symbol || "Unknown"}: ${p.sentiment} (${p.confidence_level} confidence)`;
        }).join("\n");

        const userEmail = (follow as any).auth_users?.email;
        if (userEmail) {
          const result = await sendEmail({ to: userEmail, subject, text: message });
          if (result.success) {
            await supabase.from("alert_log").insert({
              alert_type: "prediction",
              user_id: follow.user_id,
              ticker_symbol: ticker_symbols.join(", "),
              subject,
              message,
              metadata: { source_follow: true, source_id: follow.source_id },
              status: "sent",
              delivery_channel: "email",
              sent_at: new Date().toISOString(),
            });
            sent++;
          }
        }
      }
      return sent;
    });

    return {
      status: "completed",
      predictions_alerted: prediction_ids.length,
      alerts_sent: alertsSent,
      follow_alerts_sent: followAlertsSent,
    };
  }
);
