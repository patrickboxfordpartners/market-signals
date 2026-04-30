import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { extractFeatures } from "../../lib/ml-features.js";
import { predict, activeConfig as defaultConfig, type ModelConfig } from "../../lib/ml-model.js";

export const generatePredictions = inngest.createFunction(
  {
    id: "generate-predictions",
    name: "Generate ML price movement predictions",
    triggers: [{ cron: "0 6 * * *" }], // 6 AM daily, before market open
  },
  async ({ step }) => {
    const today = new Date();
    const predictionDate = today.toISOString();

    // Load active model config from DB (falls back to DEFAULT if not found)
    const activeConfig = await step.run("load-model-config", async () => {
      const { data } = await supabase
        .from("model_configs")
        .select("config")
        .eq("model_type", "price_movement_24h")
        .eq("is_active", true)
        .order("trained_at", { ascending: false })
        .limit(1)
        .single();

      return (data?.config as ModelConfig) || defaultConfig;
    });

    // Get active tickers
    const activeTickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    });

    if (activeTickers.length === 0) {
      return { message: "No active tickers to predict" };
    }

    // Generate predictions for 24h and 7d timeframes
    const predictions = await step.run("generate-all-predictions", async () => {
      const results = [];

      for (const ticker of activeTickers) {
        // Extract features for today
        const features = await extractFeatures(ticker.id, today);

        if (!features) {
          console.log(`No features available for ${ticker.symbol}, skipping`);
          continue;
        }

        // Generate 24h prediction
        const prediction24h = predict(features, activeConfig);
        const target24h = new Date(today);
        target24h.setDate(target24h.getDate() + 1);

        results.push({
          ticker_id: ticker.id,
          symbol: ticker.symbol,
          model_type: "price_movement_24h",
          prediction: prediction24h,
          features,
          target_date: target24h.toISOString(),
        });

        // Generate 7d prediction
        const prediction7d = predict(features, activeConfig);
        const target7d = new Date(today);
        target7d.setDate(target7d.getDate() + 7);

        results.push({
          ticker_id: ticker.id,
          symbol: ticker.symbol,
          model_type: "price_movement_7d",
          prediction: prediction7d,
          features,
          target_date: target7d.toISOString(),
        });
      }

      return results;
    });

    // Store predictions in database
    const stored = await step.run("store-predictions", async () => {
      const records = predictions.map((p) => ({
        ticker_id: p.ticker_id,
        model_type: p.model_type,
        prediction_direction: p.prediction.direction,
        confidence_score: p.prediction.confidence,
        predicted_magnitude: p.prediction.magnitude,
        features: p.features,
        model_version: activeConfig.version,
        trained_at: new Date().toISOString(),
        prediction_date: predictionDate,
        target_date: p.target_date,
      }));

      const { error } = await supabase
        .from("model_predictions")
        .upsert(records, {
          onConflict: "ticker_id,model_type,prediction_date",
        });

      if (error) {
        console.error("Error storing predictions:", error);
        return { stored: 0 };
      }

      return { stored: records.length };
    });

    // Trigger high-confidence prediction alerts
    const highConfidencePredictions = predictions.filter(
      (p) => p.prediction.confidence >= 0.70 && p.model_type === "price_movement_24h"
    );

    if (highConfidencePredictions.length > 0) {
      await step.sendEvent("trigger-ml-prediction-alerts", {
        name: "ml-predictions/high-confidence",
        data: {
          predictions: highConfidencePredictions.map((p) => ({
            ticker_id: p.ticker_id,
            symbol: p.symbol,
            direction: p.prediction.direction,
            confidence: p.prediction.confidence,
            magnitude: p.prediction.magnitude,
            key_signals: p.prediction.interpretation.key_signals,
          })),
        },
      });
    }

    return {
      tickers_analyzed: activeTickers.length,
      predictions_generated: predictions.length,
      high_confidence_count: highConfidencePredictions.length,
      stored: stored.stored,
    };
  }
);
