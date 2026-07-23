/**
 * Inngest function: run Vibe-Trading sentiment_intelligence_team swarm
 * for a ticker and persist results to swarm_signals table.
 *
 * Two entry points:
 *   - Event "ticker/swarm-sentiment.requested" — on-demand per ticker
 *   - Cron "0 7 * * 1-5" — daily at 7 AM UTC, weekdays only
 */

import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { isUSMarketOpen } from "../../lib/market-calendar.js";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

const VIBE_TRADING_DIR = process.env.VIBE_TRADING_DIR || "/Users/patrickmitchell/Vibe-Trading";
// On Railway: /usr/bin/python3 (system install). Locally: venv python.
const VIBE_PYTHON = process.env.VIBE_PYTHON || path.join(VIBE_TRADING_DIR, ".venv/bin/python");

// ── Spawn vibe-trading CLI to run the swarm ───────────────────────────────

async function runSwarm(symbol: string): Promise<{
  runId: string | null;
  success: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const script = `
import sys, json, os
sys.path.insert(0, '${VIBE_TRADING_DIR}/agent')
os.chdir('${VIBE_TRADING_DIR}')

# Load .env
from dotenv import load_dotenv
load_dotenv('${VIBE_TRADING_DIR}/agent/.env')

from src.swarm.runtime import SwarmRuntime
import asyncio

async def main():
    runtime = SwarmRuntime()
    result = await runtime.run(
        preset_name='sentiment_intelligence_team',
        user_vars={'market': '${symbol} US equities', 'timeframe': 'daily'},
        background=False
    )
    print(json.dumps({
        'run_id': result.run_id,
        'status': result.status,
        'task_summaries': {k: v for k, v in result.task_summaries.items()},
    }))

asyncio.run(main())
`;

    const proc = spawn(VIBE_PYTHON, ["-c", script], {
      cwd: VIBE_TRADING_DIR,
      env: { ...process.env, PYTHONPATH: VIBE_TRADING_DIR },
      timeout: 600_000, // 10 minutes max
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code: number) => {
      if (code !== 0) {
        resolve({ runId: null, success: false, error: stderr.slice(-500) });
        return;
      }
      try {
        // Find last JSON line in stdout
        const lines = stdout.trim().split("\n");
        const jsonLine = lines.filter(l => l.startsWith("{")).pop();
        if (!jsonLine) {
          resolve({ runId: null, success: false, error: "No JSON output from swarm" });
          return;
        }
        const parsed = JSON.parse(jsonLine);
        resolve({ runId: parsed.run_id, success: parsed.status === "completed" });
      } catch (e) {
        resolve({ runId: null, success: false, error: `Parse error: ${stdout.slice(-200)}` });
      }
    });
  });
}

// ── Read run artifacts from disk ──────────────────────────────────────────

function readRunArtifacts(runId: string): {
  news?: string; social?: string; flow?: string; synthesis?: string;
} {
  const base = path.join(VIBE_TRADING_DIR, "agent/.swarm/runs", runId, "artifacts");
  const read = (agent: string) => {
    try {
      return fs.readFileSync(path.join(base, agent, "report.md"), "utf8");
    } catch {
      return undefined;
    }
  };
  return {
    news: read("news_analyst"),
    social: read("social_analyst"),
    flow: read("flow_analyst"),
    synthesis: read("signal_synthesizer"),
  };
}

// ── Parse composite score from synthesis report ───────────────────────────

function parseSwarmOutput(artifacts: ReturnType<typeof readRunArtifacts>): {
  composite_score: number | null;
  composite_label: string | null;
  historical_pct_1yr: number | null;
  reversal_signal: string | null;
  reversal_triggered: boolean;
  news_score: number | null;
  social_score: number | null;
  flow_score: number | null;
  fear_greed_score: number | null;
  overheat_watch: boolean;
} {
  const result = {
    composite_score: null as number | null,
    composite_label: null as string | null,
    historical_pct_1yr: null as number | null,
    reversal_signal: "NEUTRAL" as string | null,
    reversal_triggered: false,
    news_score: null as number | null,
    social_score: null as number | null,
    flow_score: null as number | null,
    fear_greed_score: null as number | null,
    overheat_watch: false,
  };

  // Parse synthesis report for composite score
  if (artifacts.synthesis) {
    const text = artifacts.synthesis;

    // Composite score: "Composite Score: 45.09" or "54.74 / 100"
    const compMatch = text.match(/[Cc]omposite[:\s]+(?:Score[:\s]+)?([+-]?\d+\.?\d*)/);
    if (compMatch) result.composite_score = parseFloat(compMatch[1]);

    // Label: "Neutral", "Optimistic", "Bearish" etc.
    const labelMatch = text.match(/(?:label|status|signal)[:\s—]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
    if (labelMatch) result.composite_label = labelMatch[1];

    // Historical percentile
    const pctMatch = text.match(/(\d+)(?:th|st|nd|rd)\s+percentile/i);
    if (pctMatch) result.historical_pct_1yr = parseInt(pctMatch[1]);

    // Reversal signal
    if (/reversal[:\s]+LONG/i.test(text)) { result.reversal_signal = "LONG"; result.reversal_triggered = true; }
    else if (/reversal[:\s]+SHORT/i.test(text)) { result.reversal_signal = "SHORT"; result.reversal_triggered = true; }

    // Component scores from table
    const newsMatch = text.match(/[Nn]ews[:\s|]+([+-]?\d+\.?\d*)/);
    if (newsMatch) result.news_score = parseFloat(newsMatch[1]);

    const socialMatch = text.match(/[Ss]ocial[:\s|]+([+-]?\d+\.?\d*)/);
    if (socialMatch) result.social_score = parseFloat(socialMatch[1]);

    const flowMatch = text.match(/[Ff]low[:\s|]+([+-]?\d+\.?\d*)/);
    if (flowMatch) result.flow_score = parseFloat(flowMatch[1]);
  }

  // Parse social report for fear/greed and overheat watch
  if (artifacts.social) {
    const text = artifacts.social;
    const fgMatch = text.match(/[Ff]ear\s*[&\/]\s*[Gg]reed[:\s]+(\d+\.?\d*)/);
    if (fgMatch) result.fear_greed_score = parseFloat(fgMatch[1]);
    if (/overheat|threshold.*80|80.*threshold/i.test(text)) result.overheat_watch = true;
    if (result.fear_greed_score && result.fear_greed_score >= 75) result.overheat_watch = true;
  }

  // Fallback: try parsing component scores from individual reports
  if (result.news_score === null && artifacts.news) {
    const m = artifacts.news.match(/[Ss]core[:\s]+([+-]?\d+\.?\d*)/);
    if (m) result.news_score = parseFloat(m[1]);
  }
  if (result.social_score === null && artifacts.social) {
    const m = artifacts.social.match(/[Ss]core[:\s]+([+-]?\d+\.?\d*)/);
    if (m) result.social_score = parseFloat(m[1]);
  }
  if (result.flow_score === null && artifacts.flow) {
    const m = artifacts.flow.match(/[Ff]low[^:]*[Ss]core[:\s]+([+-]?\d+\.?\d*)/);
    if (m) result.flow_score = parseFloat(m[1]);
  }

  // Recompute composite if synthesis parse failed but components succeeded
  if (result.composite_score === null &&
      result.news_score !== null &&
      result.social_score !== null &&
      result.flow_score !== null) {
    result.composite_score = Math.round(
      result.news_score * 0.25 +
      result.social_score * 0.35 +
      result.flow_score * 0.40
    );
  }

  return result;
}

// ── Compute day-over-day deltas ────────────────────────────────────────────

async function getPreviousSignal(symbol: string): Promise<{
  composite_score: number | null;
  news_score: number | null;
  social_score: number | null;
  flow_score: number | null;
} | null> {
  const { data } = await supabase
    .from("swarm_signals")
    .select("composite_score, news_score, social_score, flow_score")
    .eq("symbol", symbol)
    .lt("run_date", new Date().toISOString().split("T")[0])
    .order("run_date", { ascending: false })
    .limit(1)
    .single();
  return data || null;
}

// ── Inngest function: on-demand per ticker ────────────────────────────────

export const runSwarmSentiment = inngest.createFunction(
  {
    id: "run-swarm-sentiment",
    name: "Run Sentiment Intelligence Swarm",
    retries: 1,
    timeouts: { finish: "15m" },
    triggers: [{ event: "ticker/swarm-sentiment.requested" }],
  },
  async ({ event, step }) => {
    const { symbol, tickerId } = event.data as { symbol: string; tickerId?: string };

    // 1. Resolve tickerId if not provided
    const resolvedTickerId = await step.run("resolve-ticker", async () => {
      if (tickerId) return tickerId;
      const { data } = await supabase
        .from("tickers")
        .select("id")
        .eq("symbol", symbol.toUpperCase())
        .single();
      return data?.id || null;
    });

    // 2. Run the swarm
    const swarmResult = await step.run("run-swarm", async () => {
      return await runSwarm(symbol.toUpperCase());
    });

    if (!swarmResult.success || !swarmResult.runId) {
      console.error(`[swarm-sentiment] Swarm failed for ${symbol}:`, swarmResult.error);
      return { symbol, success: false, error: swarmResult.error };
    }

    // 3. Parse artifacts
    const { parsed, artifacts } = await step.run("parse-artifacts", async () => {
      const arts = readRunArtifacts(swarmResult.runId!);
      const parsed = parseSwarmOutput(arts);
      return { parsed, artifacts: arts };
    });

    // 4. Get previous day's signal for delta
    const prev = await step.run("get-previous", async () => {
      return await getPreviousSignal(symbol.toUpperCase());
    });

    // 5. Upsert to Supabase
    await step.run("persist-signal", async () => {
      const today = new Date().toISOString().split("T")[0];
      const row = {
        ticker_id: resolvedTickerId,
        symbol: symbol.toUpperCase(),
        run_date: today,
        swarm_run_id: swarmResult.runId,
        model_used: "grok-3-mini",
        ...parsed,
        composite_delta: prev?.composite_score != null && parsed.composite_score != null
          ? Math.round((parsed.composite_score - prev.composite_score) * 100) / 100
          : null,
        news_delta: prev?.news_score != null && parsed.news_score != null
          ? Math.round((parsed.news_score - prev.news_score) * 100) / 100
          : null,
        social_delta: prev?.social_score != null && parsed.social_score != null
          ? Math.round((parsed.social_score - prev.social_score) * 100) / 100
          : null,
        flow_delta: prev?.flow_score != null && parsed.flow_score != null
          ? Math.round((parsed.flow_score - prev.flow_score) * 100) / 100
          : null,
        news_report: artifacts.news?.slice(0, 8000) || null,
        social_report: artifacts.social?.slice(0, 8000) || null,
        flow_report: artifacts.flow?.slice(0, 8000) || null,
        synthesis_report: artifacts.synthesis?.slice(0, 8000) || null,
      };

      const { error } = await supabase
        .from("swarm_signals")
        .upsert(row, { onConflict: "symbol,run_date" });

      if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
      return { persisted: true };
    });

    return {
      symbol,
      success: true,
      composite_score: parsed.composite_score,
      composite_label: parsed.composite_label,
      reversal_signal: parsed.reversal_signal,
      overheat_watch: parsed.overheat_watch,
    };
  }
);

// ── Inngest function: daily cron ──────────────────────────────────────────

export const dailySwarmSentimentRefresh = inngest.createFunction(
  {
    id: "daily-swarm-sentiment-refresh",
    name: "Daily Swarm Sentiment Refresh",
    retries: 1,
    triggers: [{ cron: "0 7 * * 1-5" }], // 7 AM UTC, Mon–Fri
  },
  async ({ step }) => {
    // Fetch active tickers with recent mentions
    const tickers = await step.run("fetch-active-tickers", async () => {
      const { data } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true)
        .gte("avg_daily_mentions", 5)
        .limit(20); // Swarm is expensive — cap at 20 per day
      return data || [];
    });

    const marketOpen = await step.run("check-market-open", async () => {
      return { open: isUSMarketOpen() };
    });
    if (!marketOpen.open) {
      return { skipped: "market closed" };
    }

    // Stagger dispatches — each swarm takes ~3 min, run sequentially
    await step.run("dispatch-swarms", async () => {
      for (const ticker of tickers) {
        await inngest.send({
          name: "ticker/swarm-sentiment.requested",
          data: { symbol: ticker.symbol, tickerId: ticker.id },
        });
        // 5-second stagger to avoid hammering the xAI API
        await new Promise((r) => setTimeout(r, 5000));
      }
    });

    return { dispatched: tickers.length, symbols: tickers.map(t => t.symbol) };
  }
);
