import type { FeatureVector } from "./ml-features.js";

export interface ModelConfig {
  version: string;
  weights: {
    mention_delta_pct: number;
    sentiment_ratio: number;
    avg_source_credibility: number;
    high_confidence_predictions: number;
    recent_spike: number;
  };
  thresholds: {
    bullish: number; // Score above this = bullish
    bearish: number; // Score below this = bearish
    high_confidence: number; // Confidence threshold
  };
}

// Default model configuration (v1 - heuristic baseline)
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  version: "1.0.0-heuristic",
  weights: {
    mention_delta_pct: 0.25, // Mention surge = bullish signal
    sentiment_ratio: 0.30, // Sentiment is important
    avg_source_credibility: 0.20, // Trust credible sources more
    high_confidence_predictions: 0.15, // High-confidence calls matter
    recent_spike: 0.10, // Spikes indicate momentum
  },
  thresholds: {
    bullish: 0.55, // >0.55 = bullish
    bearish: 0.45, // <0.45 = bearish
    high_confidence: 0.65, // Confidence >= 0.65 for alerts
  },
};

export interface PredictionResult {
  direction: "up" | "down" | "neutral";
  confidence: number; // 0-1
  magnitude: number | null; // Expected % change (null if not confident enough)
  score: number; // Raw model score
  interpretation: {
    key_signals: string[];
    risk_factors: string[];
  };
}

/**
 * Generate prediction from features using configured model
 */
export function predict(
  features: FeatureVector,
  config: ModelConfig = DEFAULT_MODEL_CONFIG
): PredictionResult {
  // Normalize features to 0-1 scale
  const normalizedMentionDelta = Math.max(-1, Math.min(1, features.mention_delta_pct / 100));
  const normalizedSentiment = features.sentiment_ratio; // Already 0-1
  const normalizedCredibility = features.avg_source_credibility; // Already 0-1
  const normalizedPredictions = Math.min(1, features.high_confidence_predictions / 5); // Cap at 5
  const normalizedSpike = features.recent_spike ? 1 : 0;

  // Calculate weighted score
  const score =
    normalizedMentionDelta * config.weights.mention_delta_pct +
    normalizedSentiment * config.weights.sentiment_ratio +
    normalizedCredibility * config.weights.avg_source_credibility +
    normalizedPredictions * config.weights.high_confidence_predictions +
    normalizedSpike * config.weights.recent_spike;

  // Normalize score to 0-1 range (since weights sum to 1.0)
  const normalizedScore = (score + 1) / 2; // Convert from [-1, 1] to [0, 1]

  // Determine direction
  let direction: "up" | "down" | "neutral";
  if (normalizedScore > config.thresholds.bullish) {
    direction = "up";
  } else if (normalizedScore < config.thresholds.bearish) {
    direction = "down";
  } else {
    direction = "neutral";
  }

  // Calculate confidence (distance from neutral threshold)
  const neutralMidpoint = (config.thresholds.bullish + config.thresholds.bearish) / 2;
  const confidence = Math.abs(normalizedScore - neutralMidpoint) * 2; // 0-1 scale

  // Estimate magnitude based on signal strength
  let magnitude: number | null = null;
  if (confidence >= config.thresholds.high_confidence) {
    // Stronger signals = larger predicted moves
    const baseMove = 2.0; // Base 2% move
    const intensityMultiplier = 1 + features.sentiment_intensity;
    const mentionMultiplier = 1 + Math.abs(normalizedMentionDelta);

    magnitude = baseMove * intensityMultiplier * mentionMultiplier * (direction === "down" ? -1 : 1);
    magnitude = Math.round(magnitude * 100) / 100; // Round to 2 decimals
  }

  // Generate interpretation
  const keySignals: string[] = [];
  const riskFactors: string[] = [];

  if (Math.abs(normalizedMentionDelta) > 0.3) {
    keySignals.push(
      normalizedMentionDelta > 0
        ? "Strong mention surge detected"
        : "Mention volume declining"
    );
  }

  if (features.sentiment_ratio > 0.7) {
    keySignals.push("Overwhelmingly bullish sentiment");
  } else if (features.sentiment_ratio < 0.3) {
    keySignals.push("Predominantly bearish sentiment");
  }

  if (features.high_confidence_predictions > 0) {
    keySignals.push(`${features.high_confidence_predictions} high-confidence prediction(s)`);
  }

  if (features.recent_spike) {
    keySignals.push("Recent mention spike detected");
  }

  if (features.avg_source_credibility < 0.4) {
    riskFactors.push("Low source credibility");
  }

  if (features.mention_count < 10) {
    riskFactors.push("Low mention volume (sample size)");
  }

  if (features.sentiment_intensity < 0.2) {
    riskFactors.push("Weak sentiment signal");
  }

  return {
    direction,
    confidence: Math.round(confidence * 100) / 100,
    magnitude,
    score: Math.round(normalizedScore * 100) / 100,
    interpretation: {
      key_signals: keySignals.length > 0 ? keySignals : ["No strong signals"],
      risk_factors: riskFactors.length > 0 ? riskFactors : ["Standard risk"],
    },
  };
}

/**
 * Calculate model performance metrics
 */
export function calculateMetrics(predictions: Array<{
  predicted: "up" | "down" | "neutral";
  actual: "up" | "down" | "neutral";
}>): {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  by_class: Record<string, { precision: number; recall: number }>;
} {
  if (predictions.length === 0) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
      by_class: {},
    };
  }

  const correct = predictions.filter(p => p.predicted === p.actual).length;
  const accuracy = correct / predictions.length;

  // Calculate per-class metrics
  const classes = ["up", "down", "neutral"];
  const byClass: Record<string, { precision: number; recall: number }> = {};

  for (const cls of classes) {
    const truePositives = predictions.filter(p => p.predicted === cls && p.actual === cls).length;
    const falsePositives = predictions.filter(p => p.predicted === cls && p.actual !== cls).length;
    const falseNegatives = predictions.filter(p => p.predicted !== cls && p.actual === cls).length;

    const precision = truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;

    const recall = truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;

    byClass[cls] = {
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
    };
  }

  // Macro-averaged precision and recall
  const avgPrecision = Object.values(byClass).reduce((sum, m) => sum + m.precision, 0) / classes.length;
  const avgRecall = Object.values(byClass).reduce((sum, m) => sum + m.recall, 0) / classes.length;

  const f1Score = avgPrecision + avgRecall > 0
    ? (2 * avgPrecision * avgRecall) / (avgPrecision + avgRecall)
    : 0;

  return {
    accuracy: Math.round(accuracy * 1000) / 1000,
    precision: Math.round(avgPrecision * 1000) / 1000,
    recall: Math.round(avgRecall * 1000) / 1000,
    f1_score: Math.round(f1Score * 1000) / 1000,
    by_class: byClass,
  };
}
