import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { fetchPriceMovement } from "../../lib/ml-features.js";
import { calculateMetrics } from "../../lib/ml-model.js";

export const validateMLPredictions = inngest.createFunction(
  {
    id: "validate-ml-predictions",
    name: "Validate ML predictions against actual outcomes",
    triggers: [{ cron: "0 8 * * *" }], // 8 AM daily, after market open
  },
  async ({ step }) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Find predictions where target_date has passed and not yet validated
    const pendingValidations = await step.run("fetch-pending-validations", async () => {
      const { data, error } = await supabase
        .from("model_predictions")
        .select("*, tickers(symbol)")
        .lte("target_date", todayStr)
        .is("validated_at", null)
        .order("target_date", { ascending: true })
        .limit(100); // Validate 100 at a time

      if (error) throw error;
      return data || [];
    });

    if (pendingValidations.length === 0) {
      return { message: "No predictions to validate" };
    }

    // Validate each prediction
    const validations = await step.run("validate-predictions", async () => {
      const results = [];

      for (const prediction of pendingValidations) {
        const ticker = (prediction as any).tickers;
        if (!ticker) continue;

        const predictionDate = new Date(prediction.prediction_date);
        const targetDate = new Date(prediction.target_date);

        // Fetch actual price movement
        const actualMovement = await fetchPriceMovement(
          ticker.symbol,
          predictionDate,
          targetDate
        );

        if (!actualMovement) {
          console.log(`No price data for ${ticker.symbol}, skipping validation`);
          continue;
        }

        const wasCorrect = prediction.prediction_direction === actualMovement.direction;

        results.push({
          id: prediction.id,
          actual_direction: actualMovement.direction,
          actual_magnitude: actualMovement.magnitude,
          was_correct: wasCorrect,
          validated_at: new Date().toISOString(),
        });

        // Wait to avoid API rate limits (Alpha Vantage: 5 calls/min for free tier)
        await new Promise((resolve) => setTimeout(resolve, 12000)); // 12 seconds between calls
      }

      return results;
    });

    // Update predictions with validation results
    await step.run("store-validation-results", async () => {
      for (const validation of validations) {
        await supabase
          .from("model_predictions")
          .update({
            actual_direction: validation.actual_direction,
            actual_magnitude: validation.actual_magnitude,
            was_correct: validation.was_correct,
            validated_at: validation.validated_at,
          })
          .eq("id", validation.id);
      }
    });

    // Calculate overall model performance
    const metrics = await step.run("calculate-metrics", async () => {
      // Fetch all validated predictions for this model version
      const { data: allValidated } = await supabase
        .from("model_predictions")
        .select("prediction_direction, actual_direction, model_type, model_version")
        .not("validated_at", "is", null)
        .eq("model_version", pendingValidations[0]?.model_version);

      if (!allValidated || allValidated.length === 0) {
        return null;
      }

      // Group by model type
      const byType: Record<string, any[]> = {};
      allValidated.forEach((p) => {
        if (!byType[p.model_type]) byType[p.model_type] = [];
        byType[p.model_type].push({
          predicted: p.prediction_direction,
          actual: p.actual_direction,
        });
      });

      const metricsResults: Record<string, any> = {};
      for (const [modelType, predictions] of Object.entries(byType)) {
        metricsResults[modelType] = calculateMetrics(predictions);
      }

      return metricsResults;
    });

    // Update model_configs with latest metrics
    if (metrics) {
      await step.run("update-model-metrics", async () => {
        for (const [modelType, modelMetrics] of Object.entries(metrics)) {
          await supabase
            .from("model_configs")
            .upsert(
              {
                model_type: modelType,
                model_version: pendingValidations[0]?.model_version,
                config: { version: pendingValidations[0]?.model_version },
                accuracy: modelMetrics.accuracy,
                precision: modelMetrics.precision,
                recall: modelMetrics.recall,
                f1_score: modelMetrics.f1_score,
                metrics_by_class: modelMetrics.by_class,
                is_active: true,
                trained_at: new Date().toISOString(),
              },
              { onConflict: "model_type,model_version" }
            );
        }
      });
    }

    return {
      validated: validations.length,
      correct: validations.filter((v) => v.was_correct).length,
      metrics,
    };
  }
);
