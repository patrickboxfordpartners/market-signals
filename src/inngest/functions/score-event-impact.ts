import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { llmClient } from "../../integrations/llm/client.js";

const SYSTEM_PROMPT = `You are a senior macroeconomic analyst specializing in government policy impact on financial markets. You analyze upcoming government events and predict their market impact with precision.

Your analysis must be data-driven and reference historical precedent. Consider:
- The current market regime (risk-on vs risk-off)
- Market expectations vs likely outcome (priced in vs surprise potential)
- Direct and second-order effects on specific sectors and stocks
- Timeframe of impact (immediate reaction vs sustained trend)

CALIBRATION: Be accurate, not dramatic. Most government events have low impact (magnitude 1-3). Reserve high scores (7+) for genuinely market-moving events like rate decisions with uncertain outcomes, major legislation passing, or unexpected enforcement actions. A routine Treasury auction is 1-2. A scheduled FOMC with clear consensus is 3-4. An FOMC with split expectations is 7-9.

Respond in valid JSON matching the provided schema exactly. No markdown, no explanation outside the JSON.`;

function buildUserPrompt(event: any, historicalContext: string): string {
  const daysUntil = Math.max(
    0,
    Math.ceil((new Date(event.event_date).getTime() - Date.now()) / 86400000)
  );

  return `Analyze this upcoming government event and predict its market impact:

EVENT:
- Title: ${event.title}
- Type: ${event.event_type}
- Date: ${event.event_date}
- Days Until: ${daysUntil}
- Description: ${event.description || "N/A"}
- Participants: ${(event.participants || []).join(", ") || "N/A"}
- Related Topics: ${(event.related_topics || []).join(", ") || "N/A"}
- Source Category: ${event.source_category}

${historicalContext}

Respond with JSON:
{
  "impact_magnitude": <1-10 integer>,
  "impact_direction": "bullish" | "bearish" | "uncertain",
  "confidence": <0.0-1.0 float>,
  "timeframe": "immediate" | "short_term" | "medium_term",
  "affected_sectors": ["sector1", "sector2"],
  "affected_tickers": ["TICK1", "TICK2"],
  "reasoning": "<2-4 sentence explanation>",
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "historical_precedent": "<1 sentence citing a relevant past event>"
}`;
}

export const scoreEventImpact = inngest.createFunction(
  {
    id: "score-event-impact",
    name: "Score predicted market impact of government event via LLM",
    triggers: [{ event: "government/event.needs-scoring" }],
    concurrency: { limit: 3 },
    retries: 2,
  },
  async ({ event, step }) => {
    const eventId = (event.data as { event_id: string }).event_id;

    const govEvent = await step.run("fetch-event", async () => {
      const { data, error } = await supabase
        .from("government_events")
        .select("*")
        .eq("id", eventId)
        .single();
      if (error || !data) throw new Error(`Event ${eventId} not found`);
      return data;
    });

    const historicalContext = await step.run("fetch-historical-context", async () => {
      const { data } = await supabase
        .from("government_events")
        .select("title, event_date, event_impact_scores(impact_magnitude, impact_direction, reasoning)")
        .eq("event_type", govEvent.event_type)
        .eq("status", "completed")
        .order("event_date", { ascending: false })
        .limit(3);

      if (!data || data.length === 0) return "";

      const examples = data.map((e: any) => {
        const score = e.event_impact_scores?.[0];
        return `- ${e.title} (${e.event_date?.split("T")[0]}): magnitude ${score?.impact_magnitude || "?"}, ${score?.impact_direction || "?"}`;
      });

      return `HISTORICAL PRECEDENT (similar past events):\n${examples.join("\n")}`;
    });

    const score = await step.run("call-llm", async () => {
      const response = await llmClient.chat({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(govEvent, historicalContext) },
        ],
        temperature: 0.3,
        maxTokens: 800,
        json: true,
      });

      const text = response.content.trim();
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in LLM response");

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (
        typeof parsed.impact_magnitude !== "number" ||
        parsed.impact_magnitude < 1 ||
        parsed.impact_magnitude > 10
      )
        throw new Error("Invalid impact_magnitude");
      if (!["bullish", "bearish", "uncertain"].includes(parsed.impact_direction))
        throw new Error("Invalid impact_direction");

      return parsed;
    });

    await step.run("store-score", async () => {
      // Mark previous scores as not latest
      await supabase
        .from("event_impact_scores")
        .update({ is_latest: false })
        .eq("event_id", eventId);

      const { error } = await supabase.from("event_impact_scores").insert({
        event_id: eventId,
        impact_magnitude: score.impact_magnitude,
        impact_direction: score.impact_direction,
        confidence: Math.min(1, Math.max(0, score.confidence || 0.5)),
        timeframe: score.timeframe || "short_term",
        affected_sectors: score.affected_sectors || [],
        affected_tickers: score.affected_tickers || [],
        reasoning: score.reasoning || "",
        key_factors: score.key_factors || [],
        historical_precedent: score.historical_precedent || "",
        model_provider: "xai",
        model_name: "grok-3-mini",
        is_latest: true,
      });

      if (error) throw new Error(`Store score failed: ${error.message}`);
    });

    // Alert on high-impact events
    if (score.impact_magnitude >= 7) {
      await step.run("emit-high-impact-alert", async () => {
        await inngest.send({
          name: "government/high-impact-event",
          data: {
            event_id: eventId,
            title: govEvent.title,
            magnitude: score.impact_magnitude,
            direction: score.impact_direction,
            tickers: score.affected_tickers,
          },
        });
      });
    }

    return {
      event_id: eventId,
      magnitude: score.impact_magnitude,
      direction: score.impact_direction,
      confidence: score.confidence,
      tickers: score.affected_tickers,
    };
  }
);
