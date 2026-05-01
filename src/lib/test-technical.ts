/**
 * Test technical indicators
 * Usage: npx tsx src/lib/test-technical.ts
 */

import "dotenv/config";
import YahooFinance from "yahoo-finance2";
import {
  calculateTechnicalIndicators,
  analyzeTrend,
  calculateChartScore,
  type OHLCVBar,
} from "./technical-indicators.js";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function testTechnicalIndicators() {
  console.log("🧪 Testing Technical Indicators\n");

  try {
    const symbol = "NVDA";
    console.log(`Fetching historical data for ${symbol}...\n`);

    const quote = await yahooFinance.quote(symbol);
    const history = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      interval: "1d",
    });

    if (!history.quotes || history.quotes.length === 0) {
      throw new Error("No historical data found");
    }

    // Convert to OHLCV format
    const bars: OHLCVBar[] = history.quotes.map((q) => ({
      date: new Date(q.date).toISOString().split("T")[0],
      open: q.open || 0,
      high: q.high || 0,
      low: q.low || 0,
      close: q.close || 0,
      volume: q.volume || 0,
    }));

    console.log(`✓ Loaded ${bars.length} days of data\n`);

    // Calculate indicators
    const indicators = calculateTechnicalIndicators(bars);
    const trend = analyzeTrend(indicators);
    const chartScore = calculateChartScore(indicators, trend);

    console.log("📊 Technical Indicators:");
    console.log(`  Current Price: $${indicators.currentPrice.toFixed(2)}`);
    console.log(`  MA5:  $${indicators.ma5?.toFixed(2) || "N/A"}`);
    console.log(`  MA10: $${indicators.ma10?.toFixed(2) || "N/A"}`);
    console.log(`  MA20: $${indicators.ma20?.toFixed(2) || "N/A"}`);
    console.log(`  MA50: $${indicators.ma50?.toFixed(2) || "N/A"}`);
    console.log(`  MA200: $${indicators.ma200?.toFixed(2) || "N/A"}`);
    console.log(`  RSI(14): ${indicators.rsi14?.toFixed(1) || "N/A"}`);
    console.log(`  MACD: ${indicators.macd?.toFixed(2) || "N/A"}`);
    console.log(`  Volume Ratio: ${indicators.volumeRatio?.toFixed(2) || "N/A"}x\n`);

    console.log("📈 Trend Analysis:");
    console.log(`  Uptrend: ${trend.isUptrend ? "✓ Yes" : "✗ No"}`);
    console.log(`  Strength: ${trend.trendStrength}`);
    console.log(`  MA Alignment: ${trend.maAlignment}`);
    console.log(`  Price above MA5: ${trend.priceVsMA.aboveMA5 ? "✓" : "✗"}`);
    console.log(`  Price above MA10: ${trend.priceVsMA.aboveMA10 ? "✓" : "✗"}`);
    console.log(`  Price above MA20: ${trend.priceVsMA.aboveMA20 ? "✓" : "✗"}`);
    console.log(`  Price above MA50: ${trend.priceVsMA.aboveMA50 ? "✓" : "✗"}`);
    console.log(`  Price above MA200: ${trend.priceVsMA.aboveMA200 ? "✓" : "✗"}\n`);

    console.log("🎯 Chart Score:");
    console.log(`  Total: ${chartScore.score}/100`);
    console.log(`  Breakdown:`);
    console.log(`    - Trend: ${chartScore.breakdown.trend}/40`);
    console.log(`    - Momentum: ${chartScore.breakdown.momentum}/30`);
    console.log(`    - Volume: ${chartScore.breakdown.volume}/20`);
    console.log(`    - Support: ${chartScore.breakdown.support}/10\n`);

    console.log("🚦 Signals:");
    console.log(`  Golden Cross: ${chartScore.signals.golden_cross ? "✓" : "✗"}`);
    console.log(`  Death Cross: ${chartScore.signals.death_cross ? "✓" : "✗"}`);
    console.log(`  MACD Bullish: ${chartScore.signals.macd_bullish ? "✓" : "✗"}`);
    console.log(`  RSI Oversold: ${chartScore.signals.rsi_oversold ? "✓" : "✗"}`);
    console.log(`  RSI Overbought: ${chartScore.signals.rsi_overbought ? "✓" : "✗"}`);
    console.log(`  High Volume: ${chartScore.signals.high_volume ? "✓" : "✗"}\n`);

    console.log("✅ Test passed!");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testTechnicalIndicators();
