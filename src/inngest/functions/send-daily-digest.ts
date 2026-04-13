import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { sendEmail, sendWebhook } from "../../lib/email.js";

export const sendDailyDigest = inngest.createFunction(
  {
    id: "send-daily-digest",
    name: "Send daily market signals digest",
    triggers: [{ cron: "0 9 * * *" }] // 9 AM daily
  },
  async ({ step }) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get alert preferences for users who have daily digest enabled
    const alertPrefs = await step.run("fetch-alert-preferences", async () => {
      const { data, error } = await supabase
        .from("alert_preferences")
        .select("*")
        .eq("daily_digest_enabled", true);

      if (error) throw error;
      return data || [];
    });

    if (alertPrefs.length === 0) {
      return { status: "skipped", reason: "No users with daily digest enabled" };
    }

    // Fetch yesterday's activity summary
    const digestData = await step.run("fetch-digest-data", async () => {
      // Get spikes detected yesterday
      const { data: spikes } = await supabase
        .from("mention_frequency")
        .select("*, tickers(symbol, company_name)")
        .eq("date", yesterday)
        .eq("spike_detected", true)
        .order("mention_count", { ascending: false })
        .limit(10);

      // Get high-confidence predictions from yesterday
      const { data: predictions } = await supabase
        .from("predictions")
        .select(`
          *,
          tickers(symbol),
          sources(name)
        `)
        .gte("prediction_date", `${yesterday}T00:00:00Z`)
        .lt("prediction_date", `${today}T00:00:00Z`)
        .eq("confidence_level", "high")
        .order("created_at", { ascending: false })
        .limit(10);

      // Get top active sources yesterday
      const { data: topSources } = await supabase
        .from("mentions")
        .select("source_id, sources(name, platform)")
        .gte("mentioned_at", `${yesterday}T00:00:00Z`)
        .lt("mentioned_at", `${today}T00:00:00Z`)
        .limit(1000); // Fetch a large batch to count locally

      // Count mentions per source
      const sourceCounts = new Map<string, { name: string; platform: string; count: number }>();
      topSources?.forEach((m: any) => {
        if (m.source_id && m.sources) {
          const existing = sourceCounts.get(m.source_id);
          if (existing) {
            existing.count++;
          } else {
            sourceCounts.set(m.source_id, {
              name: m.sources.name,
              platform: m.sources.platform,
              count: 1,
            });
          }
        }
      });

      const sortedSources = Array.from(sourceCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        spikes: spikes || [],
        predictions: predictions || [],
        topSources: sortedSources,
      };
    });

    // Send digest to each user
    let digestsSent = 0;

    for (const pref of alertPrefs) {
      await step.run(`send-digest-${pref.user_id}`, async () => {
        // Build digest message
        const subject = `📊 Street Insights Daily Digest - ${yesterday}`;

        let message = `Daily Summary for ${yesterday}\n\n`;

        // Spikes section
        if (digestData.spikes.length > 0) {
          message += `🚨 TOP SPIKES (${digestData.spikes.length})\n`;
          digestData.spikes.slice(0, 5).forEach((s: any) => {
            const ticker = s.tickers as any;
            message += `  • ${ticker?.symbol}: ${s.mention_count} mentions (avg: ${s.unique_sources} sources)\n`;
          });
          message += "\n";
        } else {
          message += "🚨 No significant spikes detected\n\n";
        }

        // Predictions section
        if (digestData.predictions.length > 0) {
          message += `🎯 HIGH-CONFIDENCE PREDICTIONS (${digestData.predictions.length})\n`;
          digestData.predictions.slice(0, 5).forEach((p: any) => {
            const ticker = p.tickers as any;
            const source = p.sources as any;
            const direction = p.sentiment === "bullish" ? "📈" : p.sentiment === "bearish" ? "📉" : "➡️";
            const target = p.price_target ? ` → $${p.price_target}` : "";
            message += `  ${direction} ${ticker?.symbol}${target} - ${source?.name}\n`;
          });
          message += "\n";
        } else {
          message += "🎯 No high-confidence predictions\n\n";
        }

        // Top sources section
        if (digestData.topSources.length > 0) {
          message += `📈 MOST ACTIVE SOURCES\n`;
          digestData.topSources.forEach((s, idx) => {
            message += `  ${idx + 1}. ${s.name} (${s.platform}): ${s.count} mentions\n`;
          });
        }

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
            type: "digest",
            subject,
            message,
            summary: digestData,
          });

          if (result.success) {
            deliveryStatus = "sent";
          } else {
            deliveryStatus = "failed";
            deliveryError = result.error || null;
          }
        }

        // Log the digest
        const { error: logError } = await supabase.from("alert_log").insert({
          alert_type: "digest",
          user_id: pref.user_id,
          ticker_symbol: null,
          subject,
          message,
          metadata: {
            date: yesterday,
            spike_count: digestData.spikes.length,
            prediction_count: digestData.predictions.length,
          },
          status: deliveryStatus,
          delivery_channel: deliveryChannel,
          error_message: deliveryError,
          sent_at: deliveryStatus === "sent" ? new Date().toISOString() : null,
        });

        if (logError) {
          console.error("Failed to log digest:", logError);
          return;
        }

        if (deliveryStatus === "sent") {
          digestsSent++;
        }
      });
    }

    return {
      status: "completed",
      digests_sent: digestsSent,
      summary: {
        spikes: digestData.spikes.length,
        predictions: digestData.predictions.length,
        top_sources: digestData.topSources.length,
      },
    };
  }
);
