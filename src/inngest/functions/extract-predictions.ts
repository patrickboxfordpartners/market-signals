import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import {
  runDebateAnalysis,
  runQuickAnalysis,
  shouldRunFullDebate,
  type MentionContext,
  type DebateVerdict,
} from "../../lib/debate-analysis.js";

export const extractPredictions = inngest.createFunction(
  {
    id: "extract-predictions",
    name: "Extract predictions from unprocessed mentions",
    triggers: [{ cron: "0 * * * *" }, { event: "extract/predictions" }],
  },
  async ({ event, step }) => {
    // Get unprocessed mentions
    const unprocessedMentions = await step.run("fetch-unprocessed-mentions", async () => {
      let query = supabase
        .from("mentions")
        .select("id, ticker_id, source_id, content, platform, url, mentioned_at")
        .eq("processed", false)
        .order("mentioned_at", { ascending: false })
        .limit(50);

      const eventData = event.data as Record<string, unknown> | undefined;
      if (eventData?.ticker_ids) {
        query = query.in("ticker_id", eventData.ticker_ids as string[]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    });

    if (unprocessedMentions.length === 0) {
      return { message: "No unprocessed mentions" };
    }

    // Fetch ticker symbols upfront for context building
    const tickerIds = [...new Set(unprocessedMentions.map((m) => m.ticker_id))];
    const tickerMap = await step.run("fetch-ticker-symbols", async () => {
      const { data } = await supabase
        .from("tickers")
        .select("id, symbol")
        .in("id", tickerIds);
      return Object.fromEntries((data || []).map((t) => [t.id, t.symbol])) as Record<string, string>;
    });

    // Split into full-debate vs quick-analysis based on content quality
    const debateMentions = unprocessedMentions.filter((m) => shouldRunFullDebate(m.content));
    const quickMentions = unprocessedMentions.filter((m) => !shouldRunFullDebate(m.content));

    let predictionsCreated = 0;
    let mentionsProcessed = 0;
    const highConfidencePredictions: { id: string; symbol: string }[] = [];

    // --- Full debate pipeline (substantive mentions: 3 Grok calls each) ---
    for (const mention of debateMentions) {
      const symbol = tickerMap[mention.ticker_id] ?? "UNKNOWN";

      const result = await step.run(`debate-${mention.id}`, async () => {
        try {
          const ctx: MentionContext = {
            ticker: symbol,
            content: mention.content,
            platform: mention.platform,
          };
          const verdict = await runDebateAnalysis(ctx);
          return { mention, verdict, error: null };
        } catch (err) {
          console.error(`Debate analysis failed for mention ${mention.id}:`, err);
          return { mention, verdict: null, error: String(err) };
        }
      });

      await step.run(`store-debate-${mention.id}`, async () => {
        if (result.verdict) {
          await storePrediction(result.mention, result.verdict, symbol, highConfidencePredictions);
          if (result.verdict.is_prediction) predictionsCreated++;
        }
        await supabase
          .from("mentions")
          .update({ processed: true, is_prediction: result.verdict?.is_prediction || false })
          .eq("id", result.mention.id);
        mentionsProcessed++;
      });

      await new Promise((r) => setTimeout(r, 2000));
    }

    // --- Quick analysis pipeline (short/low-signal mentions: 1 Grok call each) ---
    if (quickMentions.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < quickMentions.length; i += batchSize) {
        const batch = quickMentions.slice(i, i + batchSize);

        const results = await step.run(`quick-batch-${batch[0].id}`, async () => {
          const analyzed = [];
          for (const mention of batch) {
            try {
              const verdict = await runQuickAnalysis(mention.content);
              analyzed.push({ mention, verdict });
            } catch {
              analyzed.push({ mention, verdict: null });
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          return analyzed;
        });

        await step.run(`store-quick-${batch[0].id}`, async () => {
          for (const { mention, verdict } of results) {
            const symbol = tickerMap[mention.ticker_id] ?? "UNKNOWN";
            if (verdict) {
              await storePrediction(mention, verdict, symbol, highConfidencePredictions);
              if (verdict.is_prediction) predictionsCreated++;
            }
            await supabase
              .from("mentions")
              .update({ processed: true, is_prediction: verdict?.is_prediction || false })
              .eq("id", mention.id);
            mentionsProcessed++;
          }
        });
      }
    }

    if (highConfidencePredictions.length > 0) {
      await step.sendEvent("trigger-prediction-alerts", {
        name: "predictions/high-confidence",
        data: {
          prediction_ids: highConfidencePredictions.map((p) => p.id),
          ticker_symbols: highConfidencePredictions.map((p) => p.symbol),
        },
      });
    }

    return {
      mentions_processed: mentionsProcessed,
      debate_pipeline: debateMentions.length,
      quick_pipeline: quickMentions.length,
      predictions_created: predictionsCreated,
      high_confidence_predictions: highConfidencePredictions.length,
    };
  }
);

// ---------------------------------------------------------------------------
// Storage helper
// ---------------------------------------------------------------------------

async function storePrediction(
  mention: { id: string; ticker_id: string; source_id: string | null; mentioned_at: string },
  verdict: DebateVerdict,
  symbol: string,
  highConfidencePredictions: { id: string; symbol: string }[]
) {
  if (!verdict.is_prediction || !verdict.sentiment || !mention.source_id) return;

  const { data: newPrediction, error } = await supabase
    .from("predictions")
    .insert({
      ticker_id: mention.ticker_id,
      source_id: mention.source_id,
      mention_id: mention.id,
      sentiment: verdict.sentiment,
      price_target: verdict.price_target,
      timeframe_days: verdict.timeframe_days,
      confidence_level: verdict.confidence_level,
      reasoning: verdict.reasoning,
      data_sources_cited: verdict.data_sources_cited,
      catalysts: verdict.catalysts,
      reasoning_quality_score: verdict.reasoning_quality_score,
      data_discipline_score: verdict.data_discipline_score,
      transparency_score: verdict.transparency_score,
      prediction_date: mention.mentioned_at,
      target_date: verdict.timeframe_days
        ? new Date(
            new Date(mention.mentioned_at).getTime() +
              verdict.timeframe_days * 24 * 60 * 60 * 1000
          ).toISOString()
        : null,
      bull_case: verdict.bull_case || null,
      bear_case: verdict.bear_case || null,
      risks: verdict.risks || [],
      debate_rounds: verdict.debate_rounds ?? 0,
    })
    .select("id");

  if (error || !newPrediction) return;

  if (verdict.confidence_level === "high") {
    highConfidencePredictions.push({ id: newPrediction[0].id, symbol });
  }

  await supabase
    .from("sources")
    .update({
      uses_data_sources: (verdict.data_sources_cited?.length ?? 0) > 0,
      reasoning_quality: verdict.reasoning_quality_score,
      transparency_score: verdict.transparency_score,
    })
    .eq("id", mention.source_id);
}
