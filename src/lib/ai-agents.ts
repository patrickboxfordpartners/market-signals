/**
 * AI Agent Analysis Service
 * Generate investment framework analyses from different personas (Buffett, Lynch, Graham, etc.)
 */

// @ts-nocheck

import { supabase } from "../integrations/supabase/client";
import { routeLLMRequest } from "./llm-router-secure";
import { getEconomicContextForAI } from "./economic-data";
import { fmpClient, type HistoricalPrice } from "./fmp";
import { parseLLMJson } from "./llm-json.js";

export interface AgentPersona {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: string;
  prompt_template: string;
  display_order: number;
}

export interface AgentAnalysis {
  id: string;
  ticker_id: string;
  agent_persona_id: string;
  sentiment: "bullish" | "bearish" | "neutral" | "hold";
  confidence_score: number;
  analysis_text: string;
  key_factors: string[];
  risks: string[];
  recommendation: string;
  analyzed_at: string;
  price_at_analysis: number | null;
  expires_at: string;
  // Joined persona data
  persona_name?: string;
  persona_slug?: string;
  persona_framework?: string;
  // Structured signal fields
  thesis?: string;
  catalysts?: string[];
  invalidators?: string[];
  watch_items?: string[];
  risk_flags?: string[];
  signal_type?: "momentum" | "reversal" | "breakout" | "hold" | "avoid";
  time_sensitivity?: "immediate" | "days" | "weeks" | "months";
}

export interface TickerContext {
  symbol: string;
  company_name: string;
  sector?: string;
  industry?: string;
  price?: number;
  market_cap?: number;
  avg_mentions?: number;
  sentiment_breakdown?: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  recent_news?: string[];
  technical_signals?: string[];
}

/**
 * Blend a quantitative score with a sentiment score using a configurable weight.
 * Both inputs are clamped to [0, 100] before blending.
 */
export function blendScores(
  quantScore: number,
  sentimentScore: number,
  quantWeight = 0.6
): number {
  const q = Math.min(100, Math.max(0, quantScore));
  const s = Math.min(100, Math.max(0, sentimentScore));
  return Math.round(q * quantWeight + s * (1 - quantWeight));
}

/**
 * Convenience wrapper for the Inngest agent pipeline that blends an
 * AlphaVantage technical/fundamental score with a Grok sentiment score.
 */
export function blendAlphaVantageWithSentiment(
  alphaVantageScore: number,
  grokSentimentScore: number,
  weight?: number
): number {
  return blendScores(alphaVantageScore, grokSentimentScore, weight);
}

/**
 * Fetch all agent personas
 */
export async function getAgentPersonas(): Promise<AgentPersona[]> {
  const { data, error } = await supabase
    .from("ai_agent_personas")
    .select("*")
    .eq("is_active" as any, true)
    .order("display_order" as any);

  if (error) {
    console.error("[ai-agents] Error fetching personas:", error);
    return [];
  }

  return (data as any) || [];
}

/**
 * Fetch analyses for a ticker (check cache first)
 */
export async function getTickerAgentAnalyses(tickerId: string): Promise<AgentAnalysis[]> {
  const { data, error } = await supabase
    .from("ai_agent_analyses")
    .select(
      `
      *,
      ai_agent_personas!inner (
        name,
        slug,
        framework
      )
    `
    )
    .eq("ticker_id", tickerId)
    .gt("expires_at", new Date().toISOString()) // Only non-expired
    .order("analyzed_at", { ascending: false });

  if (error) {
    console.error("[ai-agents] Error fetching analyses:", error);
    return [];
  }

  // Flatten the joined persona data
  return (data || []).map((item: any) => ({
    ...item,
    persona_name: item.ai_agent_personas?.name,
    persona_slug: item.ai_agent_personas?.slug,
    persona_framework: item.ai_agent_personas?.framework,
  }));
}

/**
 * Generate analysis for a ticker using a specific agent persona
 * This would typically be called server-side via an Edge Function or worker
 */
export async function generateAgentAnalysis(
  tickerId: string,
  personaId: string,
  context: TickerContext,
  llmApiKey: string
): Promise<AgentAnalysis | null> {
  try {
    // 1. Get the persona
    const { data: persona } = await supabase
      .from("ai_agent_personas")
      .select("*")
      .eq("id", personaId)
      .single();

    if (!persona) {
      console.error("[ai-agents] Persona not found:", personaId);
      return null;
    }

    // 2. Build context string + fetch grounding + economic context in parallel
    const [contextStr, groundingBlock, economicContext] = await Promise.all([
      Promise.resolve(buildContextString(context)),
      buildGroundingBlock(context.symbol),
      getEconomicContextForAI().catch(() => ""),
    ]);

    // 3. Fill in the prompt template
    let prompt = persona.prompt_template
      .replace("{symbol}", context.symbol)
      .replace("{company_name}", context.company_name || context.symbol)
      .replace("{context}", contextStr);

    // Prepend grounding block (real recent OHLCV) before any analysis
    if (groundingBlock) {
      prompt = groundingBlock + "\n\n" + prompt;
    }

    // Append economic context if available
    if (economicContext) {
      prompt += `\n\n${economicContext}`;
    }

    // 4. Call LLM (with automatic fallback)
    const llmResponse = await routeLLMRequest({
      systemPrompt: `You are an expert financial analyst embodying a specific investment philosophy. Provide structured, actionable analysis.

Zero-hallucination policy: every claim in your analysis must trace to data provided in the context (price, market cap, sector, sentiment breakdown, technical signals, recent news). Do not cite statistics, earnings figures, or events not present in the provided context. If a detail is not in the context, write "not in provided data" rather than inferring from training knowledge.

Respond with valid JSON only, no markdown fences, matching this exact schema:
{
  "sentiment": "bullish" | "bearish" | "neutral" | "hold",
  "confidence": <integer 0-100>,
  "key_factors": ["<factor>", ...],
  "risks": ["<risk>", ...],
  "recommendation": "<one sentence>",
  "thesis": "<optional one-sentence investment thesis>",
  "catalysts": ["<optional upcoming catalyst>", ...],
  "invalidators": ["<optional condition that would invalidate the thesis>", ...],
  "watch_items": ["<optional thing to monitor>", ...],
  "risk_flags": ["<optional specific named risk>", ...],
  "signal_type": "<optional: momentum | reversal | breakout | hold | avoid>",
  "time_sensitivity": "<optional: immediate | days | weeks | months>"
}

The optional fields (thesis through time_sensitivity) may be omitted if not clearly supported by the data.`,
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    const analysisText = llmResponse.content;
    console.log(`[ai-agents] Generated analysis using ${llmResponse.provider} (${llmResponse.model}) in ${llmResponse.latencyMs}ms`);

    // 5. Parse the LLM response
    const parsed = parseAgentResponse(analysisText);

    // 6. Save to database
    const { data: analysis, error } = await supabase
      .from("ai_agent_analyses")
      .insert({
        ticker_id: tickerId,
        agent_persona_id: personaId,
        sentiment: parsed.sentiment,
        confidence_score: parsed.confidence,
        analysis_text: analysisText,
        key_factors: parsed.keyFactors,
        risks: parsed.risks,
        recommendation: parsed.recommendation,
        price_at_analysis: context.price || null,
        ttl_hours: 24,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[ai-agents] Error saving analysis:", error);
      return null;
    }

    return {
      ...analysis,
      persona_name: persona.name,
      persona_slug: persona.slug,
      persona_framework: persona.framework,
    };
  } catch (err) {
    console.error("[ai-agents] Error generating analysis:", err);
    return null;
  }
}

/**
 * Fetch 30 days of OHLCV and render a markdown grounding block.
 * Ported from Vibe-Trading agent/src/swarm/grounding.py.
 *
 * Prevents the LLM from citing stale training-data prices by injecting
 * real recent bars with an explicit instruction to use only these values.
 * Failures are swallowed — the analysis proceeds without grounding rather
 * than blocking on a data fetch error.
 */
async function buildGroundingBlock(symbol: string): Promise<string> {
  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 35); // 35 calendar days → ~25 trading days
    const fromStr = from.toISOString().split("T")[0];
    const toStr = today.toISOString().split("T")[0];

    const result = await fmpClient.getHistoricalPrices(symbol, fromStr, toStr);
    const bars: HistoricalPrice[] = result?.historical ?? [];
    if (!bars.length) return "";

    // FMP returns newest-first; reverse to chronological order
    const sorted = [...bars].reverse();
    const closes = sorted.map((b) => b.close);
    const windowLow = Math.min(...closes);
    const windowHigh = Math.max(...closes);
    const lastBar = sorted[sorted.length - 1];
    const firstBar = sorted[0];

    // Show last 5 bars in the prompt table
    const tail = sorted.slice(-5);
    const tableRows = tail
      .map((b) => `| ${b.date} | ${b.close.toFixed(2)} | ${Number(b.volume).toLocaleString()} |`)
      .join("\n");

    return [
      "## Ground Truth — Recent Market Data",
      "",
      "**These are the authoritative current prices for this analysis.** Do NOT cite",
      "prices, valuations, or returns from your training data — markets have moved.",
      "When you state a price, it must come from this table or the context below.",
      "",
      `### ${symbol}  (${firstBar.date} → ${lastBar.date})`,
      "",
      "| Date | Close | Volume |",
      "| --- | ---: | ---: |",
      tableRows,
      "",
      `**Latest close:** $${lastBar.close.toFixed(2)} (${lastBar.date})  ` +
        `**30-day range:** $${windowLow.toFixed(2)} – $${windowHigh.toFixed(2)}`,
    ].join("\n");
  } catch (err) {
    console.warn("[ai-agents] Grounding fetch failed, continuing without:", err);
    return "";
  }
}

/**
 * Build context string from ticker data
 */
function buildContextString(context: TickerContext): string {
  const parts: string[] = [];

  if (context.price) parts.push(`Current Price: $${context.price.toFixed(2)}`);
  if (context.market_cap)
    parts.push(`Market Cap: $${(context.market_cap / 1e9).toFixed(2)}B`);
  if (context.sector) parts.push(`Sector: ${context.sector}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);

  if (context.sentiment_breakdown) {
    const total =
      context.sentiment_breakdown.bullish +
      context.sentiment_breakdown.bearish +
      context.sentiment_breakdown.neutral;
    if (total > 0) {
      parts.push(
        `Social Sentiment: ${((context.sentiment_breakdown.bullish / total) * 100).toFixed(0)}% bullish, ${((context.sentiment_breakdown.bearish / total) * 100).toFixed(0)}% bearish`
      );
    }
  }

  if (context.avg_mentions) {
    parts.push(`Avg Daily Mentions: ${context.avg_mentions}`);
  }

  if (context.recent_news && context.recent_news.length > 0) {
    parts.push(`Recent News:\n${context.recent_news.join("\n")}`);
  }

  if (context.technical_signals && context.technical_signals.length > 0) {
    parts.push(`Technical Signals: ${context.technical_signals.join(", ")}`);
  }

  return parts.join("\n");
}

interface ParsedAgentResponse {
  sentiment: "bullish" | "bearish" | "neutral" | "hold";
  confidence: number;
  keyFactors: string[];
  risks: string[];
  recommendation: string;
  thesis?: string;
  catalysts?: string[];
  invalidators?: string[];
  watch_items?: string[];
  risk_flags?: string[];
  signal_type?: "momentum" | "reversal" | "breakout" | "hold" | "avoid";
  time_sensitivity?: "immediate" | "days" | "weeks" | "months";
}

/**
 * Parse LLM response into structured data.
 * Uses parseLLMJson for robust fence-stripping and repair.
 */
function parseAgentResponse(text: string): ParsedAgentResponse {
  const defaults: ParsedAgentResponse = {
    sentiment: "neutral",
    confidence: 50,
    keyFactors: [],
    risks: [],
    recommendation: "",
  };

  const parsed = parseLLMJson<Record<string, unknown>>(text, {});

  const validSentiments = ["bullish", "bearish", "neutral", "hold"];
  const validSignalTypes = ["momentum", "reversal", "breakout", "hold", "avoid"];
  const validTimeSensitivities = ["immediate", "days", "weeks", "months"];

  const result: ParsedAgentResponse = {
    sentiment: validSentiments.includes(parsed.sentiment as string)
      ? (parsed.sentiment as ParsedAgentResponse["sentiment"])
      : defaults.sentiment,
    confidence:
      typeof parsed.confidence === "number"
        ? Math.min(100, Math.max(0, parsed.confidence))
        : defaults.confidence,
    keyFactors: Array.isArray(parsed.key_factors)
      ? (parsed.key_factors as unknown[]).filter(Boolean).map(String)
      : defaults.keyFactors,
    risks: Array.isArray(parsed.risks)
      ? (parsed.risks as unknown[]).filter(Boolean).map(String)
      : defaults.risks,
    recommendation:
      typeof parsed.recommendation === "string"
        ? parsed.recommendation.trim()
        : defaults.recommendation,
  };

  if (typeof parsed.thesis === "string") result.thesis = parsed.thesis.trim();

  if (Array.isArray(parsed.catalysts))
    result.catalysts = (parsed.catalysts as unknown[]).filter(Boolean).map(String);

  if (Array.isArray(parsed.invalidators))
    result.invalidators = (parsed.invalidators as unknown[]).filter(Boolean).map(String);

  if (Array.isArray(parsed.watch_items))
    result.watch_items = (parsed.watch_items as unknown[]).filter(Boolean).map(String);

  if (Array.isArray(parsed.risk_flags))
    result.risk_flags = (parsed.risk_flags as unknown[]).filter(Boolean).map(String);

  if (validSignalTypes.includes(parsed.signal_type as string))
    result.signal_type = parsed.signal_type as ParsedAgentResponse["signal_type"];

  if (validTimeSensitivities.includes(parsed.time_sensitivity as string))
    result.time_sensitivity = parsed.time_sensitivity as ParsedAgentResponse["time_sensitivity"];

  return result;
}

interface DiagnosisStep1 {
  diagnosis: string;
  root_causes: string[];
}

interface DiagnosisStep2 {
  hypotheses: Array<{
    hypothesis: string;
    priority: number;
  }>;
}

interface SignalDivergenceDiagnosis {
  diagnosis: string;
  hypotheses: Array<{
    hypothesis: string;
    priority: number;
  }>;
  confidence: number;
}

/**
 * Two-step AlphaEvo-style diagnosis for when sentiment diverges from price action.
 * Step 1: diagnose root cause. Step 2: generate testable hypotheses.
 */
export async function diagnoseSignalDivergence(
  symbol: string,
  sentimentScore: number,
  priceChangePct: number,
  context: TickerContext,
  llmApiKey: string
): Promise<SignalDivergenceDiagnosis | null> {
  try {
    const contextStr = buildContextString(context);

    const step1Raw = await routeLLMRequest({
      systemPrompt:
        "You are a financial signal analyst. Identify why a sentiment signal diverged from price action. Be specific and data-driven. Return JSON: { diagnosis: string, root_causes: string[] }",
      userPrompt: `Symbol: ${symbol}. Sentiment score: ${sentimentScore}/100. Actual price change: ${priceChangePct}%. Context: ${contextStr}`,
      temperature: 0,
      maxTokens: 400,
    });

    const step1Fallback: DiagnosisStep1 = { diagnosis: "", root_causes: [] };
    const step1 = parseLLMJson<DiagnosisStep1>(step1Raw.content, step1Fallback);

    if (!step1.diagnosis) return null;

    const step2Raw = await routeLLMRequest({
      systemPrompt:
        "You are a hypothesis generator for financial signals. Given a diagnosis, propose 2-3 testable hypotheses for what's actually driving price. Return JSON: { hypotheses: [{ hypothesis: string, priority: number }] }",
      userPrompt: `Diagnosis: ${step1.diagnosis}. Root causes: ${(step1.root_causes || []).join(", ")}. Symbol: ${symbol}.`,
      temperature: 0,
      maxTokens: 400,
    });

    const step2Fallback: DiagnosisStep2 = { hypotheses: [] };
    const step2 = parseLLMJson<DiagnosisStep2>(step2Raw.content, step2Fallback);

    const divergence = Math.abs(sentimentScore - (50 + priceChangePct));
    const confidence = Math.min(100, Math.max(0, Math.round(100 - divergence)));

    return {
      diagnosis: step1.diagnosis,
      hypotheses: Array.isArray(step2.hypotheses) ? step2.hypotheses : [],
      confidence,
    };
  } catch (err) {
    console.error("[ai-agents] diagnoseSignalDivergence error:", err);
    return null;
  }
}

/**
 * Trigger analysis generation for all personas for a ticker
 * This should be called server-side (Edge Function or Inngest worker)
 */
export async function triggerFullAnalysis(tickerId: string, context: TickerContext): Promise<void> {
  console.log(`[ai-agents] Triggering full analysis for ${context.symbol}`);
  // This would call an Edge Function or queue an Inngest job
  // For now, just log it
  // await fetch('/api/ai-agents/analyze', { method: 'POST', body: JSON.stringify({ tickerId, context }) })
}
