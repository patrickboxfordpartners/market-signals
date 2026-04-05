import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const XAI_API_KEY = process.env.XAI_API_KEY;

interface ExtractionResult {
  is_prediction: boolean;
  sentiment: "bullish" | "bearish" | "neutral";
  price_target?: number;
  timeframe_days?: number;
  confidence_level?: "low" | "medium" | "high";
  reasoning?: string;
  data_sources_cited?: string[];
  catalysts?: string[];
  reasoning_quality_score: number;
  data_discipline_score: number;
  transparency_score: number;
}

export const extractPredictions = inngest.createFunction(
  { id: "extract-predictions", name: "Extract predictions from unprocessed mentions" },
  [{ cron: "0 * * * *" }, { event: "extract/predictions" }],
  async ({ event, step }) => {
    // Get unprocessed mentions (limit batch size to avoid timeout)
    const unprocessedMentions = await step.run("fetch-unprocessed-mentions", async () => {
      let query = supabase
        .from("mentions")
        .select("id, ticker_id, source_id, content, platform, url, mentioned_at")
        .eq("processed", false)
        .order("mentioned_at", { ascending: false })
        .limit(50); // Process 50 at a time

      // If triggered by spike detection, filter to specific tickers
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

    // Process in batches of 10 for API efficiency
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < unprocessedMentions.length; i += batchSize) {
      batches.push(unprocessedMentions.slice(i, i + batchSize));
    }

    let predictionsCreated = 0;
    let mentionsProcessed = 0;

    for (const batch of batches) {
      const results = await step.run(`analyze-batch-${batch[0].id}`, async () => {
        const analyzed = [];

        for (const mention of batch) {
          try {
            const analysis = await analyzeWithGrok(mention.content);
            analyzed.push({ mention, analysis });
          } catch (error) {
            console.error(`Error analyzing mention ${mention.id}:`, error);
            // Mark as processed even if analysis fails to avoid retry loop
            analyzed.push({ mention, analysis: null });
          }

          // Rate limit: ~60 requests/min for Grok (adjust as needed)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return analyzed;
      });

      // Store predictions and update mentions
      await step.run(`store-batch-${batch[0].id}`, async () => {
        for (const { mention, analysis } of results) {
          // Mark mention as processed
          await supabase
            .from("mentions")
            .update({
              processed: true,
              is_prediction: analysis?.is_prediction || false,
            })
            .eq("id", mention.id);

          mentionsProcessed++;

          // If it's a valid prediction, store it
          if (analysis?.is_prediction && analysis.sentiment && mention.source_id) {
            const { error } = await supabase.from("predictions").insert({
              ticker_id: mention.ticker_id,
              source_id: mention.source_id,
              mention_id: mention.id,
              sentiment: analysis.sentiment,
              price_target: analysis.price_target,
              timeframe_days: analysis.timeframe_days,
              confidence_level: analysis.confidence_level,
              reasoning: analysis.reasoning,
              data_sources_cited: analysis.data_sources_cited,
              catalysts: analysis.catalysts,
              reasoning_quality_score: analysis.reasoning_quality_score,
              data_discipline_score: analysis.data_discipline_score,
              transparency_score: analysis.transparency_score,
              prediction_date: mention.mentioned_at,
              target_date: analysis.timeframe_days
                ? new Date(
                    new Date(mention.mentioned_at).getTime() +
                      analysis.timeframe_days * 24 * 60 * 60 * 1000
                  ).toISOString()
                : null,
            });

            if (!error) {
              predictionsCreated++;

              // Update source quality metrics
              await supabase
                .from("sources")
                .update({
                  uses_data_sources: analysis.data_sources_cited
                    ? analysis.data_sources_cited.length > 0
                    : false,
                  reasoning_quality: analysis.reasoning_quality_score,
                  transparency_score: analysis.transparency_score,
                })
                .eq("id", mention.source_id!);
            }
          }
        }
      });
    }

    return {
      mentions_processed: mentionsProcessed,
      predictions_created: predictionsCreated,
    };
  }
);

// Analyze mention with Grok using equity analyst frameworks
async function analyzeWithGrok(content: string): Promise<ExtractionResult> {
  if (!XAI_API_KEY) {
    throw new Error("XAI API key not configured");
  }

  const prompt = `You are an equity analyst evaluating a social media post about stocks.

Analyze this post and extract:
1. Is this a PREDICTION (specific price target, timeframe, or directional call)?
2. Sentiment: bullish, bearish, or neutral
3. Price target (if mentioned)
4. Timeframe in days (if mentioned - e.g., "next week" = 7 days, "by Q2" = 90 days)
5. Confidence level: low, medium, high
6. Main reasoning/thesis
7. Data sources cited (company filings, reports, etc.)
8. Catalysts mentioned (earnings, product launch, etc.)

Then SCORE the reasoning quality using these frameworks:

**Lynch Pitch (Bull Case) - Score 0-1:**
- Do they state a clear thesis?
- Do they cite real data/documents?
- Do they explain the business model?
- Do they identify catalysts?
- Do they consider risks?

**Munger Invert (Bear Case) - Score 0-1:**
- Do they consider what could go wrong?
- Do they examine balance sheet risks?
- Do they admit uncertainty?

**Data Discipline - Score 0-1:**
- Do they cite specific sources (NOT just "I think")?
- Do they use actual numbers?
- Do they reference documents?

**Transparency - Score 0-1:**
- Do they admit uncertainty?
- Do they acknowledge risks?
- Do they avoid absolute language ("definitely", "guaranteed")?

Post:
"""
${content}
"""

Respond ONLY with valid JSON:
{
  "is_prediction": boolean,
  "sentiment": "bullish" | "bearish" | "neutral",
  "price_target": number | null,
  "timeframe_days": number | null,
  "confidence_level": "low" | "medium" | "high" | null,
  "reasoning": "string | null",
  "data_sources_cited": ["source1", "source2"] | null,
  "catalysts": ["catalyst1", "catalyst2"] | null,
  "reasoning_quality_score": 0-1,
  "data_discipline_score": 0-1,
  "transparency_score": 0-1
}`;

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
          content: "You are an equity analyst. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return result;
}
