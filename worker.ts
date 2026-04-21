import "dotenv/config";
import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest } from "./src/inngest/client.js";
import * as functions from "./src/inngest/functions/index.js";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Inngest endpoint — serveHost tells Inngest Cloud how to reach this worker
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: Object.values(functions),
    serveHost: process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined,
    servePath: "/api/inngest",
  })
);

// In-memory quote cache (refreshes every 60s max)
let quoteCache: { data: any[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 60_000;

const DEFAULT_SYMBOLS = [
  "NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "META", "AMD", "PLTR",
  "AMZN", "NFLX", "SPY", "QQQ", "COIN", "SOFI", "SMCI", "ARM",
];

app.get("/api/quotes", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string | undefined;
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase())
      : DEFAULT_SYMBOLS;

    const now = Date.now();
    const cacheKey = symbols.join(",");

    // Return cache if fresh and same symbols
    if (
      quoteCache.data.length > 0 &&
      now - quoteCache.ts < CACHE_TTL &&
      quoteCache.data.map((q) => q.symbol).join(",") === cacheKey
    ) {
      return res.json(quoteCache.data);
    }

    const results = await yahooFinance.quote(symbols);
    const quotes = (Array.isArray(results) ? results : [results]).map((q) => ({
      symbol: q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      marketState: q.marketState,
    }));

    quoteCache = { data: quotes, ts: now };
    res.json(quotes);
  } catch (err: any) {
    // Return stale cache on error instead of spamming logs
    if (quoteCache.data.length > 0) {
      return res.json(quoteCache.data);
    }
    res.status(502).json({ error: "Quote service temporarily unavailable" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "market-signals-worker" });
});

app.listen(port, () => {
  console.log(`🔄 Market Signals Worker running on port ${port}`);
  console.log(`📊 Inngest endpoint: http://localhost:${port}/api/inngest`);
  console.log(`\nFunctions registered:`);
  Object.values(functions).forEach(fn => {
    console.log(`  - ${fn.name}`);
  });
});
