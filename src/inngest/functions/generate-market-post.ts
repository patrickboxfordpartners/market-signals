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
        .select("*, tickers(symbol, company_name)")
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

    const spikesSummary = spikes.map((s: Record<string, unknown>) => {
      const ticker = s.tickers as Record<string, unknown> | null;
      return `${ticker?.symbol} (${ticker?.company_name}): ${s.mention_count} mentions, sentiment ${s.avg_sentiment_score ?? "N/A"}`;
    }).join("\n");

    const predictionsSummary = predictions.map((p: Record<string, unknown>) =>
      `${p.ticker_symbol}: ${p.direction} (${p.confidence}% confidence) - ${p.rationale}`
    ).join("\n");

    const title = `Street Insights: ${spikes.map((s: Record<string, unknown>) => (s.tickers as Record<string, unknown>)?.symbol).join(", ")}`;
    const draftMeta = { spike_count: spikes.length, prediction_count: predictions.length };

    // Generate LinkedIn post
    const linkedinDraft = await step.run("generate-linkedin-draft", async () => {
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY not set");

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${XAI_API_KEY}` },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            {
              role: "system",
              content: `You are a sharp financial commentator writing LinkedIn posts for Street Insights, a market intelligence platform. Write in a confident, data-driven tone. Keep posts under 1300 characters. Include relevant data points. No hashtag spam, 2-3 max. No emojis. Professional but not boring.`,
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

    // Generate Twitter/X post
    const twitterDraft = await step.run("generate-twitter-draft", async () => {
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY not set");

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${XAI_API_KEY}` },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            {
              role: "system",
              content: `You are a sharp financial commentator writing tweets for Street Insights on X (Twitter). Write in a punchy, direct tone for FinTwit. Must be under 280 characters including spaces. Lead with the most striking data point. No hashtag spam, 1-2 max. No emojis. No "not financial advice" disclaimers — keep it tight.`,
            },
            {
              role: "user",
              content: `Write a single tweet about today's most notable market signal.\n\nSpikes detected:\n${spikesSummary}\n\nAI predictions:\n${predictionsSummary}\n\nPick the single most interesting signal and lead with it. Under 280 characters.`,
            },
          ],
          max_tokens: 100,
          temperature: 0.8,
        }),
      });

      if (!response.ok) throw new Error(`Grok API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    });

    // Save both drafts
    const saved = await step.run("save-drafts", async () => {
      const { data, error } = await supabase
        .from("content_drafts")
        .insert([
          { source: "market-signals", type: "linkedin", title, body: linkedinDraft, metadata: draftMeta },
          { source: "market-signals", type: "twitter", title, body: twitterDraft, metadata: draftMeta },
        ])
        .select("id");

      if (error) throw error;
      return data;
    });

    return { status: "created", draftIds: saved.map((r: { id: string }) => r.id) };
  }
);
