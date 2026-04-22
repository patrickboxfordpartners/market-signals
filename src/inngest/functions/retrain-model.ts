import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { predict, calculateMetrics, DEFAULT_MODEL_CONFIG, type ModelConfig } from "../../lib/ml-model.js";
import type { FeatureVector } from "../../lib/ml-features.js";

interface TrainingSample {
  features: FeatureVector;
  actual_direction: "up" | "down" | "neutral";
}

function scoreConfig(config: ModelConfig, samples: TrainingSample[]): number {
  if (samples.length === 0) return 0;
  const pairs = samples.map(s => ({
    predicted: predict(s.features, config).direction,
    actual: s.actual_direction,
  }));
  return calculateMetrics(pairs).accuracy;
}

function perturbWeights(config: ModelConfig, key: keyof ModelConfig["weights"], delta: number): ModelConfig {
  const newWeights = { ...config.weights, [key]: Math.max(0.01, config.weights[key] + delta) };
  // Re-normalize weights to sum to 1
  const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
  const normalized = Object.fromEntries(
    Object.entries(newWeights).map(([k, v]) => [k, v / total])
  ) as ModelConfig["weights"];
  return { ...config, weights: normalized };
}

export const retrainModel = inngest.createFunction(
  {
    id: "retrain-model",
    name: "Retrain ML model weights on validated predictions",
    triggers: [{ cron: "0 3 * * 0" }], // Weekly Sunday at 3 AM
  },
  async ({ step }) => {
    // Load training data from validated model predictions
    const trainingSamples = await step.run("load-training-data", async () => {
      const { data, error } = await supabase
        .from("model_training_data")
        .select("features, target_direction, observation_date")
        .not("target_direction", "is", null)
        .order("observation_date", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []).map(row => ({
        features: row.features as FeatureVector,
        actual_direction: row.target_direction as "up" | "down" | "neutral",
      }));
    });

    if (trainingSamples.length < 30) {
      return {
        status: "skipped",
        reason: `Insufficient training data: ${trainingSamples.length} samples (need 30+)`,
      };
    }

    // Load current active model config
    const currentConfig = await step.run("load-current-config", async () => {
      const { data } = await supabase
        .from("model_configs")
        .select("config, version")
        .eq("model_type", "price_movement_24h")
        .eq("is_active", true)
        .order("trained_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.config) {
        return data.config as ModelConfig;
      }
      return DEFAULT_MODEL_CONFIG;
    });

    // Hill-climbing optimization: iteratively perturb each weight
    const newConfig = await step.run("optimize-weights", async () => {
      let best = { ...currentConfig };
      let bestScore = scoreConfig(best, trainingSamples);

      const learningRate = 0.02;
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const weightKeys = Object.keys(best.weights) as Array<keyof ModelConfig["weights"]>;

        for (const key of weightKeys) {
          // Try positive perturbation
          const upConfig = perturbWeights(best, key, learningRate);
          const upScore = scoreConfig(upConfig, trainingSamples);

          // Try negative perturbation
          const downConfig = perturbWeights(best, key, -learningRate);
          const downScore = scoreConfig(downConfig, trainingSamples);

          if (upScore > bestScore) {
            best = upConfig;
            bestScore = upScore;
          } else if (downScore > bestScore) {
            best = downConfig;
            bestScore = downScore;
          }
        }
      }

      // Tune thresholds
      for (const bullishT of [0.50, 0.52, 0.55, 0.58, 0.60]) {
        for (const bearishT of [0.40, 0.42, 0.45, 0.48, 0.50]) {
          if (bullishT <= bearishT) continue;
          const candidate = { ...best, thresholds: { ...best.thresholds, bullish: bullishT, bearish: bearishT } };
          const score = scoreConfig(candidate, trainingSamples);
          if (score > bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
      }

      return { config: best, accuracy: bestScore };
    });

    // Only save if accuracy improved by at least 1%
    const baselineAccuracy = scoreConfig(currentConfig, trainingSamples);
    const improvement = newConfig.accuracy - baselineAccuracy;

    if (improvement < 0.01) {
      return {
        status: "no-improvement",
        baseline_accuracy: baselineAccuracy,
        new_accuracy: newConfig.accuracy,
        training_samples: trainingSamples.length,
      };
    }

    // Calculate full metrics
    const fullMetrics = await step.run("calculate-full-metrics", async () => {
      const pairs = trainingSamples.map(s => ({
        predicted: predict(s.features, newConfig.config).direction,
        actual: s.actual_direction,
      }));
      return calculateMetrics(pairs);
    });

    // Save new model config
    const versionNumber = parseFloat(currentConfig.version?.replace(/-heuristic|-retrained/, "") || "1.0.0") + 0.1;
    const newVersion = `${versionNumber.toFixed(1)}-retrained`;

    await step.run("save-new-config", async () => {
      // Deactivate current config
      await supabase
        .from("model_configs")
        .update({ is_active: false })
        .eq("model_type", "price_movement_24h")
        .eq("is_active", true);

      // Insert new config
      await supabase.from("model_configs").insert({
        model_type: "price_movement_24h",
        model_version: newVersion,
        config: { ...newConfig.config, version: newVersion },
        training_samples: trainingSamples.length,
        training_date_range: `last-500-validated`,
        accuracy: fullMetrics.accuracy,
        precision: fullMetrics.precision,
        recall: fullMetrics.recall,
        f1_score: fullMetrics.f1_score,
        metrics_by_class: fullMetrics.by_class,
        is_active: true,
        trained_at: new Date().toISOString(),
      });
    });

    return {
      status: "retrained",
      version: newVersion,
      baseline_accuracy: baselineAccuracy,
      new_accuracy: newConfig.accuracy,
      improvement: improvement,
      training_samples: trainingSamples.length,
      new_weights: newConfig.config.weights,
      new_thresholds: newConfig.config.thresholds,
      metrics: fullMetrics,
    };
  }
);
