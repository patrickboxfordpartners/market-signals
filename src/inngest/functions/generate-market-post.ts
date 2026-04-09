import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const XAI_API_KEY = process.env.XAI_API_KEY;

export const generateMarketPost = inngest.createFunction(
  {
    id: "generate-market-post",
    name: "Generate LinkedIn post from market spikes",
    triggers: [{ cron: "0 8 * * *" }] // Daily at 8am
  },
  async ({ step }) => {
    // Get recent spikes (last 24h)
    const spikes = await step.run("fetch-recent-spikes", async () => {
      const since = new Date(Date.now() - 86400000).toISOString().split("T")[0]; // date only
      const { data, error } = await supabase
        .from("mention_frequency")
        .select("*, tickers(symbol, name)")
        .eq("spike_detected", true)
        .gte("date", since)
        .order("mention_count", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    });

    if (spikes.length === 0) {
      return { status: "skipped", reason: "No spikes in last 24h" };
    }

    // Get related predictions
    const predictions = await step.run("fetch-predictions", async () => {
      const tickerIds = spikes.map((s: Record<string, unknown>) =>
        (s.tickers as Record<string, unknown>)?.symbol
      ).filter(Boolean);

      const { data, error } = await supabase
        .from("predictions")
        .select("ticker_symbol, direction, confidence, rationale")
        .in("ticker_symbol", tickerIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    });

    // Generate post with Grok
    const draft = await step.run("generate-draft", async () => {
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY not set");

      const spikesSummary = spikes.map((s: Record<string, unknown>) => {
        const ticker = s.tickers as Record<string, unknown> | null;
        return `${ticker?.symbol} (${ticker?.name}): ${s.mention_count} mentions, sentiment ${s.avg_sentiment_score ?? "N/A"}`;
      }).join("\n");

      const predictionsSummary = predictions.map((p: Record<string, unknown>) =>
        `${p.ticker_symbol}: ${p.direction} (${p.confidence}% confidence) - ${p.rationale}`
      ).join("\n");

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            {
              role: "system",
              content: `You are a sharp financial commentator writing LinkedIn posts for Boxford Partners, a consulting and technology firm. Write in a confident, data-driven tone. Keep posts under 1300 characters. Include relevant data points. No hashtag spam — 2-3 max. No emojis. Professional but not boring.`,
            },
            {
              role: "user",
              content: `Write a LinkedIn post about today's market signals.\n\nSpikes detected:\n${spikesSummary}\n\nAI predictions:\n${predictionsSummary}\n\nFrame this as market intelligence insight, not financial advice.`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`Grok API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    });

    // Save draft
    const saved = await step.run("save-draft", async () => {
      const { data, error } = await supabase
        .from("content_drafts")
        .insert({
          source: "market-signals",
          type: "linkedin",
          title: `Market Signals: ${spikes.map((s: Record<string, unknown>) => (s.tickers as Record<string, unknown>)?.symbol).join(", ")}`,
          body: draft,
          metadata: { spike_count: spikes.length, prediction_count: predictions.length },
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    });

    return { status: "created", draftId: saved.id };
  }
);
