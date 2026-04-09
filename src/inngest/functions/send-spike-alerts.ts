import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

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
      spikes_detected: spike_ids.length,
      alerts_sent: alertsSent,
    };
  }
);
