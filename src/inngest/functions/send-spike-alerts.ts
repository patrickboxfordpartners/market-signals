import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { sendEmail, sendWebhook } from "../../lib/email.js";

interface SpikeEvent {
  spike_ids: string[];
  ticker_symbols: string[];
}

export const sendSpikeAlerts = inngest.createFunction(
  {
    id: "send-spike-alerts",
    name: "Send alerts when spikes are detected",
    triggers: [{ event: "spikes/detected" }]
  },
  async ({ event, step }) => {
    const { spike_ids, ticker_symbols } = event.data as SpikeEvent;

    if (!spike_ids || spike_ids.length === 0) {
      return { status: "skipped", reason: "No spikes to alert" };
    }

    // Get alert preferences for users who have spike alerts enabled
    const alertPrefs = await step.run("fetch-alert-preferences", async () => {
      const { data, error } = await supabase
        .from("alert_preferences")
        .select("*")
        .eq("spike_alerts_enabled", true);

      if (error) throw error;
      return data || [];
    });

    if (alertPrefs.length === 0) {
      return { status: "skipped", reason: "No users with spike alerts enabled" };
    }

    // Get spike details
    const spikeData = await step.run("fetch-spike-details", async () => {
      const { data, error } = await supabase
        .from("mention_frequency")
        .select("*, tickers(symbol, company_name)")
        .in("id", spike_ids)
        .order("mention_count", { ascending: false });

      if (error) throw error;
      return data || [];
    });

    // Send alerts to each user
    let alertsSent = 0;

    for (const pref of alertPrefs) {
      // Filter spikes by user's threshold
      const relevantSpikes = spikeData.filter(
        (s: any) => s.mention_count >= (pref.spike_mention_threshold || 20)
      );

      if (relevantSpikes.length === 0) continue;

      const subject = `🚨 ${relevantSpikes.length} Spike${relevantSpikes.length > 1 ? 's' : ''} Detected`;
      const message = relevantSpikes
        .map((s: any) => {
          const ticker = s.tickers as any;
          return `${ticker?.symbol || 'Unknown'}: ${s.mention_count} mentions (${s.spike_detected ? 'SPIKE' : ''})`;
        })
        .join('\n');

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
            type: "spike",
            subject,
            message,
            spikes: relevantSpikes,
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
          alert_type: "spike",
          user_id: pref.user_id,
          ticker_symbol: ticker_symbols.join(", "),
          subject,
          message,
          metadata: {
            spike_ids,
            spike_count: relevantSpikes.length,
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

    return {
      status: "completed",
      spikes_detected: spike_ids.length,
      alerts_sent: alertsSent,
    };
  }
);
