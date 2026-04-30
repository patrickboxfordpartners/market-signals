/**
 * Bull/Bear Researcher Debate Pipeline
 *
 * Ported from TradingAgents (TauricResearch/TradingAgents) — replaces single-pass
 * Grok extraction with a structured debate that forces the model to argue both
 * sides before synthesizing a verdict. Produces materially higher-quality
 * predictions with explicit reasoning chains.
 *
 * Architecture:
 *   1. Bull Researcher  — builds the strongest possible buy case
 *   2. Bear Researcher  — builds the strongest possible sell case (sees bull argument)
 *   3. Research Manager — synthesizes debate into a structured verdict
 *
 * The synthesis output maps directly to the predictions table schema.
 */

const XAI_API_KEY = process.env.XAI_API_KEY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MentionContext {
  ticker: string;
  content: string;
  platform: string;
  recentSentimentSummary?: string;   // aggregated from recent mentions
  recentNewsSummary?: string;         // from Alpha Vantage NEWS_SENTIMENT
  priceContext?: string;              // e.g. "up 8% this week, near 52w high"
}

export interface DebateVerdict {
  is_prediction: boolean;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence_level: "low" | "medium" | "high";
  price_target: number | null;
  timeframe_days: number | null;
  reasoning: string;
  bull_case: string;
  bear_case: string;
  catalysts: string[];
  risks: string[];
  data_sources_cited: string[];
  reasoning_quality_score: number;   // 0-1
  data_discipline_score: number;     // 0-1
  transparency_score: number;        // 0-1
  debate_rounds: number;
}

interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Core Grok call
// ---------------------------------------------------------------------------

async function callGrok(
  messages: GrokMessage[],
  temperature = 0.4,
  maxTokens = 1200
): Promise<string> {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3-latest",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grok API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

// ---------------------------------------------------------------------------
// Bull Researcher
// ---------------------------------------------------------------------------

async function runBullResearcher(ctx: MentionContext): Promise<string> {
  const prompt = `You are a Bull Analyst making the strongest possible case FOR investing in ${ctx.ticker}.

Build an evidence-based bull case focused on:
- Growth potential and revenue catalysts
- Competitive advantages and market positioning
- Positive indicators from the data provided
- Why risks are overstated or manageable

Source material:
- Post/mention: "${ctx.content}"
- Platform: ${ctx.platform}
${ctx.priceContext ? `- Price context: ${ctx.priceContext}` : ""}
${ctx.recentSentimentSummary ? `- Recent sentiment: ${ctx.recentSentimentSummary}` : ""}
${ctx.recentNewsSummary ? `- Recent news: ${ctx.recentNewsSummary}` : ""}

Write a concise, specific bull case (3-5 sentences). Cite concrete evidence. Avoid generic statements.`;

  return callGrok([
    { role: "system", content: "You are an equity analyst. Be specific and evidence-based." },
    { role: "user", content: prompt },
  ], 0.5, 600);
}

// ---------------------------------------------------------------------------
// Bear Researcher
// ---------------------------------------------------------------------------

async function runBearResearcher(ctx: MentionContext, bullCase: string): Promise<string> {
  const prompt = `You are a Bear Analyst making the strongest possible case AGAINST investing in ${ctx.ticker}.

The bull analyst argued:
"${bullCase}"

Now build an evidence-based bear case focused on:
- Key risks and challenges the bull case understates
- Financial vulnerabilities, competitive threats, or macro headwinds
- Why the bull catalyst may not materialize
- What could go wrong

Source material:
- Post/mention: "${ctx.content}"
- Platform: ${ctx.platform}
${ctx.priceContext ? `- Price context: ${ctx.priceContext}` : ""}
${ctx.recentSentimentSummary ? `- Recent sentiment: ${ctx.recentSentimentSummary}` : ""}
${ctx.recentNewsSummary ? `- Recent news: ${ctx.recentNewsSummary}` : ""}

Write a concise, specific bear case (3-5 sentences). Directly counter the bull argument with evidence. Avoid generic warnings.`;

  return callGrok([
    { role: "system", content: "You are an equity analyst. Be specific and evidence-based." },
    { role: "user", content: prompt },
  ], 0.5, 600);
}

// ---------------------------------------------------------------------------
// Research Manager — synthesizes debate into structured verdict
// ---------------------------------------------------------------------------

async function runResearchManager(
  ctx: MentionContext,
  bullCase: string,
  bearCase: string
): Promise<DebateVerdict> {
  const prompt = `You are a Research Manager synthesizing a bull/bear debate on ${ctx.ticker} into a structured investment verdict.

Original trigger:
"${ctx.content}" (${ctx.platform})

Bull case:
${bullCase}

Bear case:
${bearCase}

${ctx.priceContext ? `Price context: ${ctx.priceContext}` : ""}

Evaluate both arguments critically and produce a verdict. Score the reasoning quality honestly:

**reasoning_quality_score (0-1):** Does the source post show a clear thesis with supporting evidence (Lynch Pitch standard)?
**data_discipline_score (0-1):** Does it cite real sources, numbers, or documents (not just "I think")?
**transparency_score (0-1):** Does it acknowledge uncertainty and risks (Munger Invert standard)?

A post with no data citations and pure speculation scores 0.1-0.3. A post with filings, numbers, and explicit risk acknowledgment scores 0.7-1.0.

Respond ONLY with valid JSON:
{
  "is_prediction": boolean,
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence_level": "low" | "medium" | "high",
  "price_target": number | null,
  "timeframe_days": number | null,
  "reasoning": "2-3 sentence synthesis of why this verdict",
  "bull_case": "1-2 sentence summary of strongest bull argument",
  "bear_case": "1-2 sentence summary of strongest bear argument",
  "catalysts": ["specific catalyst 1", "specific catalyst 2"],
  "risks": ["specific risk 1", "specific risk 2"],
  "data_sources_cited": ["source1", "source2"],
  "reasoning_quality_score": 0.0-1.0,
  "data_discipline_score": 0.0-1.0,
  "transparency_score": 0.0-1.0
}`;

  const raw = await callGrok([
    { role: "system", content: "You are a research manager. Respond only with valid JSON." },
    { role: "user", content: prompt },
  ], 0.2, 1000);

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned) as DebateVerdict;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the full bull/bear debate pipeline on a mention.
 *
 * For simple mentions with low information content (short posts, memes,
 * no price target) this still produces structured output — it just returns
 * is_prediction: false with low quality scores, which is the correct output.
 *
 * @param ctx  Mention + ticker context
 * @returns    Structured debate verdict ready to store in predictions table
 */
export async function runDebateAnalysis(ctx: MentionContext): Promise<DebateVerdict> {
  const bullCase = await runBullResearcher(ctx);
  const bearCase = await runBearResearcher(ctx, bullCase);
  const verdict = await runResearchManager(ctx, bullCase, bearCase);

  return {
    ...verdict,
    bull_case: bullCase,
    bear_case: bearCase,
    debate_rounds: 1,
  };
}

/**
 * Lightweight version for bulk processing — single Grok call, no debate.
 * Use this for low-signal mentions (short posts, reshares) to save tokens.
 * Falls back to original single-pass behavior.
 */
export async function runQuickAnalysis(content: string): Promise<DebateVerdict> {
  const prompt = `You are an equity analyst evaluating a social media post.

Post: "${content}"

Respond ONLY with valid JSON:
{
  "is_prediction": boolean,
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence_level": "low" | "medium" | "high",
  "price_target": number | null,
  "timeframe_days": number | null,
  "reasoning": string | null,
  "bull_case": null,
  "bear_case": null,
  "catalysts": [],
  "risks": [],
  "data_sources_cited": [],
  "reasoning_quality_score": 0.0-1.0,
  "data_discipline_score": 0.0-1.0,
  "transparency_score": 0.0-1.0,
  "debate_rounds": 0
}`;

  const raw = await callGrok([
    { role: "system", content: "You are an equity analyst. Respond only with valid JSON." },
    { role: "user", content: prompt },
  ], 0.3, 600);

  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned) as DebateVerdict;
}

/**
 * Determine whether a mention warrants the full debate pipeline.
 * Heuristic: debate is worth the 3x token cost when content is substantive.
 */
export function shouldRunFullDebate(content: string): boolean {
  const wordCount = content.trim().split(/\s+/).length;
  const hasNumbers = /\$[\d,.]+|\d+%|P\/E|EPS|revenue|earnings/i.test(content);
  const hasTarget = /target|price|forecast|expects|predicts|PT|TP/i.test(content);
  const hasTimeframe = /week|month|quarter|Q[1-4]|year|by \d{4}/i.test(content);

  // Run full debate if: long enough AND (has numbers OR has explicit target/timeframe)
  return wordCount >= 30 && (hasNumbers || hasTarget || hasTimeframe);
}
