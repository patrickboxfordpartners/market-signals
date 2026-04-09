import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { supabase } from "../integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, Target, Activity, AlertCircle } from "lucide-react";

interface MLPrediction {
  id: string;
  ticker_id: string;
  model_type: string;
  prediction_direction: string;
  confidence_score: number;
  predicted_magnitude: number | null;
  features: any;
  target_date: string;
  tickers: { symbol: string; company_name: string };
}

interface ModelMetrics {
  model_type: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export default function MLSignals() {
  const [loading, setLoading] = useState(true);
  const [predictions24h, setPredictions24h] = useState<MLPrediction[]>([]);
  const [predictions7d, setPredictions7d] = useState<MLPrediction[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [activeTab, setActiveTab] = useState<"24h" | "7d">("24h");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Fetch today's predictions
      const { data: preds24h } = await supabase
        .from("model_predictions")
        .select("*, tickers(symbol, company_name)")
        .eq("model_type", "price_movement_24h")
        .gte("prediction_date", `${today}T00:00:00Z`)
        .order("confidence_score", { ascending: false })
        .limit(20);

      const { data: preds7d } = await supabase
        .from("model_predictions")
        .select("*, tickers(symbol, company_name)")
        .eq("model_type", "price_movement_7d")
        .gte("prediction_date", `${today}T00:00:00Z`)
        .order("confidence_score", { ascending: false })
        .limit(20);

      // Fetch model metrics
      const { data: modelMetrics } = await supabase
        .from("model_configs")
        .select("model_type, accuracy, precision, recall, f1_score")
        .eq("is_active", true)
        .order("trained_at", { ascending: false });

      setPredictions24h(preds24h || []);
      setPredictions7d(preds7d || []);
      setMetrics(modelMetrics || []);
    } catch (error) {
      console.error("Error fetching ML predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "up":
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case "down":
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case "up":
        return <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bullish</span>;
      case "down":
        return <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Bearish</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">Neutral</span>;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.70) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">High</span>;
    } else if (confidence >= 0.55) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400">Medium</span>;
    } else {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">Low</span>;
    }
  };

  const activePredictions = activeTab === "24h" ? predictions24h : predictions7d;
  const activeMetric = metrics.find(m => m.model_type === `price_movement_${activeTab}`);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Activity className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-purple-500" />
            <h1 className="text-3xl font-bold">ML Price Predictions</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              BETA
            </span>
          </div>
          <p className="text-gray-400">
            AI-powered price movement predictions based on sentiment, mentions, and source quality
          </p>
        </div>

        {/* Model Performance */}
        {activeMetric && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Model Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Accuracy</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {(activeMetric.accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Precision</div>
                <div className="text-2xl font-bold">
                  {(activeMetric.precision * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Recall</div>
                <div className="text-2xl font-bold">
                  {(activeMetric.recall * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">F1 Score</div>
                <div className="text-2xl font-bold">
                  {(activeMetric.f1_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Model improves over time as more predictions are validated against actual outcomes
            </div>
          </div>
        )}

        {/* Timeframe Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("24h")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "24h"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            24 Hour Predictions
          </button>
          <button
            onClick={() => setActiveTab("7d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "7d"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            7 Day Predictions
          </button>
        </div>

        {/* Predictions List */}
        {activePredictions.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Predictions Yet</h3>
            <p className="text-gray-400">
              ML predictions are generated daily at 6 AM. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activePredictions.map((prediction) => {
              const ticker = prediction.tickers as any;
              const features = prediction.features || {};

              return (
                <div
                  key={prediction.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getDirectionIcon(prediction.prediction_direction)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl font-bold">{ticker?.symbol}</span>
                          {getDirectionBadge(prediction.prediction_direction)}
                        </div>
                        <div className="text-sm text-gray-400">{ticker?.company_name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Confidence</div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {(prediction.confidence_score * 100).toFixed(0)}%
                        </span>
                        {getConfidenceBadge(prediction.confidence_score)}
                      </div>
                    </div>
                  </div>

                  {prediction.predicted_magnitude !== null && (
                    <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Expected Move</div>
                      <div className="text-lg font-semibold">
                        {prediction.predicted_magnitude > 0 ? "+" : ""}
                        {prediction.predicted_magnitude.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Mention Delta</div>
                      <div className="font-medium">
                        {features.mention_delta_pct > 0 ? "+" : ""}
                        {features.mention_delta_pct?.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Sentiment Ratio</div>
                      <div className="font-medium">
                        {(features.sentiment_ratio * 100)?.toFixed(0)}% bullish
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Source Quality</div>
                      <div className="font-medium">
                        {(features.avg_source_credibility * 100)?.toFixed(0)}% credibility
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    Target: {new Date(prediction.target_date).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
