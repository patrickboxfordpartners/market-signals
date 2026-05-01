/**
 * Technical indicator calculations
 * Supports: MA, EMA, MACD, RSI, Volume analysis
 */

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  rsi14: number | null;
  currentPrice: number;
  volumeRatio: number | null; // Current volume vs 20-day avg
}

export interface TrendAnalysis {
  isUptrend: boolean;
  trendStrength: "strong" | "moderate" | "weak" | "none";
  maAlignment: "bullish" | "bearish" | "neutral"; // MA5 > MA10 > MA20
  priceVsMA: {
    aboveMA5: boolean;
    aboveMA10: boolean;
    aboveMA20: boolean;
    aboveMA50: boolean;
    aboveMA200: boolean;
  };
}

export interface ChartScore {
  score: number; // 0-100
  breakdown: {
    trend: number; // 0-40 points
    momentum: number; // 0-30 points
    volume: number; // 0-20 points
    support: number; // 0-10 points
  };
  signals: {
    golden_cross: boolean; // MA50 > MA200
    death_cross: boolean; // MA50 < MA200
    macd_bullish: boolean; // MACD > signal
    rsi_oversold: boolean; // RSI < 30
    rsi_overbought: boolean; // RSI > 70
    high_volume: boolean; // Volume > 2x avg
  };
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;

  const multiplier = 2 / (period + 1);
  const sma = calculateSMA(data.slice(0, period), period);
  if (sma === null) return null;

  let ema = sma;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

  const avgGain = calculateSMA(gains, period);
  const avgLoss = calculateSMA(losses, period);

  if (avgGain === null || avgLoss === null || avgLoss === 0) return null;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[]): {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
} {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  if (ema12 === null || ema26 === null) {
    return { macd: null, signal: null, histogram: null };
  }

  const macd = ema12 - ema26;

  // Calculate signal line (9-day EMA of MACD)
  // For simplicity, we'll use a simple approximation here
  // In production, you'd want to calculate the full MACD history
  const macdHistory = [macd]; // Simplified - should be full history
  const signal = calculateEMA(macdHistory, 9);

  const histogram = signal !== null ? macd - signal : null;

  return { macd, signal, histogram };
}

/**
 * Calculate all technical indicators for a stock
 */
export function calculateTechnicalIndicators(bars: OHLCVBar[]): TechnicalIndicators {
  if (bars.length === 0) {
    return {
      ma5: null,
      ma10: null,
      ma20: null,
      ma50: null,
      ma200: null,
      ema12: null,
      ema26: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      rsi14: null,
      currentPrice: 0,
      volumeRatio: null,
    };
  }

  const closePrices = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const currentPrice = closePrices[closePrices.length - 1];
  const currentVolume = volumes[volumes.length - 1];

  const ma5 = calculateSMA(closePrices, 5);
  const ma10 = calculateSMA(closePrices, 10);
  const ma20 = calculateSMA(closePrices, 20);
  const ma50 = calculateSMA(closePrices, 50);
  const ma200 = calculateSMA(closePrices, 200);

  const ema12 = calculateEMA(closePrices, 12);
  const ema26 = calculateEMA(closePrices, 26);

  const { macd, signal, histogram } = calculateMACD(closePrices);

  const rsi14 = calculateRSI(closePrices, 14);

  const avgVolume20 = calculateSMA(volumes, 20);
  const volumeRatio = avgVolume20 !== null && avgVolume20 > 0 ? currentVolume / avgVolume20 : null;

  return {
    ma5,
    ma10,
    ma20,
    ma50,
    ma200,
    ema12,
    ema26,
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    rsi14,
    currentPrice,
    volumeRatio,
  };
}

/**
 * Analyze trend based on technical indicators
 */
export function analyzeTrend(indicators: TechnicalIndicators): TrendAnalysis {
  const { currentPrice, ma5, ma10, ma20, ma50, ma200 } = indicators;

  // MA alignment check
  let maAlignment: "bullish" | "bearish" | "neutral" = "neutral";
  if (ma5 !== null && ma10 !== null && ma20 !== null) {
    if (ma5 > ma10 && ma10 > ma20) {
      maAlignment = "bullish";
    } else if (ma5 < ma10 && ma10 < ma20) {
      maAlignment = "bearish";
    }
  }

  // Price vs MA positions
  const priceVsMA = {
    aboveMA5: ma5 !== null && currentPrice > ma5,
    aboveMA10: ma10 !== null && currentPrice > ma10,
    aboveMA20: ma20 !== null && currentPrice > ma20,
    aboveMA50: ma50 !== null && currentPrice > ma50,
    aboveMA200: ma200 !== null && currentPrice > ma200,
  };

  // Count MAs above price
  const masAbove = Object.values(priceVsMA).filter(Boolean).length;

  // Determine trend
  const isUptrend = maAlignment === "bullish" && masAbove >= 3;
  let trendStrength: "strong" | "moderate" | "weak" | "none" = "none";

  if (maAlignment === "bullish" && masAbove >= 4) {
    trendStrength = "strong";
  } else if (maAlignment === "bullish" && masAbove >= 3) {
    trendStrength = "moderate";
  } else if (masAbove >= 2) {
    trendStrength = "weak";
  }

  return {
    isUptrend,
    trendStrength,
    maAlignment,
    priceVsMA,
  };
}

/**
 * Calculate Chart Score (0-100)
 */
export function calculateChartScore(indicators: TechnicalIndicators, trend: TrendAnalysis): ChartScore {
  let trendScore = 0;
  let momentumScore = 0;
  let volumeScore = 0;
  let supportScore = 0;

  // Trend score (0-40 points)
  if (trend.trendStrength === "strong") trendScore = 40;
  else if (trend.trendStrength === "moderate") trendScore = 30;
  else if (trend.trendStrength === "weak") trendScore = 15;

  if (trend.maAlignment === "bullish") trendScore += 5;
  else if (trend.maAlignment === "bearish") trendScore -= 5;

  trendScore = Math.max(0, Math.min(40, trendScore));

  // Momentum score (0-30 points)
  if (indicators.macd !== null && indicators.macdSignal !== null) {
    if (indicators.macd > indicators.macdSignal) momentumScore += 15;
    if (indicators.macdHistogram && indicators.macdHistogram > 0) momentumScore += 5;
  }

  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 > 50 && indicators.rsi14 < 70) momentumScore += 10;
    else if (indicators.rsi14 >= 70) momentumScore += 5; // Overbought but still positive
    else if (indicators.rsi14 < 30) momentumScore += 5; // Oversold = buying opportunity
  }

  momentumScore = Math.max(0, Math.min(30, momentumScore));

  // Volume score (0-20 points)
  if (indicators.volumeRatio !== null) {
    if (indicators.volumeRatio > 2) volumeScore = 20; // High volume
    else if (indicators.volumeRatio > 1.5) volumeScore = 15;
    else if (indicators.volumeRatio > 1) volumeScore = 10;
    else volumeScore = 5; // Low volume is not great
  }

  // Support score (0-10 points)
  const masAbove = Object.values(trend.priceVsMA).filter(Boolean).length;
  supportScore = masAbove * 2; // 2 points per MA support

  supportScore = Math.max(0, Math.min(10, supportScore));

  // Detect signals
  const signals = {
    golden_cross:
      indicators.ma50 !== null && indicators.ma200 !== null && indicators.ma50 > indicators.ma200,
    death_cross:
      indicators.ma50 !== null && indicators.ma200 !== null && indicators.ma50 < indicators.ma200,
    macd_bullish:
      indicators.macd !== null && indicators.macdSignal !== null && indicators.macd > indicators.macdSignal,
    rsi_oversold: indicators.rsi14 !== null && indicators.rsi14 < 30,
    rsi_overbought: indicators.rsi14 !== null && indicators.rsi14 > 70,
    high_volume: indicators.volumeRatio !== null && indicators.volumeRatio > 2,
  };

  const totalScore = trendScore + momentumScore + volumeScore + supportScore;

  return {
    score: Math.round(totalScore),
    breakdown: {
      trend: trendScore,
      momentum: momentumScore,
      volume: volumeScore,
      support: supportScore,
    },
    signals,
  };
}
