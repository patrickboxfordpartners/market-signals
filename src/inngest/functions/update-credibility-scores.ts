import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

interface SourceAnalysis {
  source_id: string;
  name: string;
  old_score: number;
  new_score: number;
  accuracy_rate: number;
  prediction_velocity: number;
  reasoning_quality: number;
}

export const updateCredibilityScores = inngest.createFunction(
  {
    id: "update-credibility-scores",
    name: "Update source credibility scores and prediction accuracy",
    triggers: [{ cron: "0 */6 * * *" }] // Every 6 hours
  },
  async ({ step }) => {
    // Get all active sources with predictions
    const sources = await step.run("fetch-sources", async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("id, name, credibility_score, total_predictions, correct_predictions, accuracy_rate")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    });

    const analyses: SourceAnalysis[] = [];

    for (const source of sources) {
      const analysis = await step.run(`analyze-${source.id}`, async () => {
        // Get all validated predictions for this source
        const { data: predictions } = await supabase
          .from("predictions")
          .select(`
            id,
            sentiment,
            confidence_level,
            reasoning_quality_score,
            data_discipline_score,
            transparency_score,
            prediction_date,
            validations (
              was_correct,
              accuracy_score,
              days_to_outcome
            )
          `)
          .eq("source_id", source.id);

        if (!predictions || predictions.length === 0) {
          return null;
        }

        // Calculate validation metrics
        const validatedPredictions = predictions.filter(
          (p: any) => p.validations && p.validations.length > 0
        );

        const totalPredictions = predictions.length;
        const correctPredictions = validatedPredictions.filter(
          (p: any) => p.validations[0]?.was_correct
        ).length;

        const accuracyRate = validatedPredictions.length > 0
          ? (correctPredictions / validatedPredictions.length) * 100
          : 0;

        // Calculate average accuracy score (how close they were)
        const avgAccuracyScore = validatedPredictions.length > 0
          ? validatedPredictions.reduce(
              (sum: number, p: any) => sum + (p.validations[0]?.accuracy_score || 0),
              0
            ) / validatedPredictions.length
          : 0;

        // Calculate prediction velocity (predictions per week in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentPredictions = predictions.filter(
          (p: any) => new Date(p.prediction_date) >= thirtyDaysAgo
        );

        const predictionVelocity = (recentPredictions.length / 30) * 7;

        // Calculate average reasoning quality
        const avgReasoningQuality = predictions
          .filter((p: any) => p.reasoning_quality_score !== null)
          .reduce((sum: number, p: any) => sum + (p.reasoning_quality_score || 0), 0) / predictions.length || 0;

        const avgDataDiscipline = predictions
          .filter((p: any) => p.data_discipline_score !== null)
          .reduce((sum: number, p: any) => sum + (p.data_discipline_score || 0), 0) / predictions.length || 0;

        const avgTransparency = predictions
          .filter((p: any) => p.transparency_score !== null)
          .reduce((sum: number, p: any) => sum + (p.transparency_score || 0), 0) / predictions.length || 0;

        // Calculate new credibility score (weighted formula)
        // 40% accuracy, 20% avg accuracy score, 15% reasoning quality, 15% data discipline, 10% transparency
        const newCredibilityScore = Math.min(100, Math.max(0,
          (accuracyRate * 0.4) +
          (avgAccuracyScore * 0.2) +
          (avgReasoningQuality * 100 * 0.15) +
          (avgDataDiscipline * 100 * 0.15) +
          (avgTransparency * 100 * 0.10)
        ));

        // Update source in database
        const { error: updateError } = await supabase
          .from("sources")
          .update({
            total_predictions: totalPredictions,
            correct_predictions: correctPredictions,
            accuracy_rate: accuracyRate,
            credibility_score: newCredibilityScore,
            reasoning_quality: avgReasoningQuality,
            transparency_score: avgTransparency,
            uses_data_sources: avgDataDiscipline > 0.5,
            updated_at: new Date().toISOString()
          })
          .eq("id", source.id);

        if (updateError) {
          console.error(`Failed to update source ${source.id}:`, updateError);
          return null;
        }

        return {
          source_id: source.id,
          name: source.name,
          old_score: source.credibility_score,
          new_score: newCredibilityScore,
          accuracy_rate: accuracyRate,
          prediction_velocity: predictionVelocity,
          reasoning_quality: avgReasoningQuality
        };
      });

      if (analysis) {
        analyses.push(analysis);
      }
    }

    // Identify significant score changes (>10 points)
    const significantChanges = analyses.filter(
      a => Math.abs(a.new_score - a.old_score) > 10
    );

    // Calculate reputation shifts
    const reputationShifts = await step.run("calculate-reputation-shifts", async () => {
      // Get top 10 sources by credibility
      const { data: topSources } = await supabase
        .from("sources")
        .select("id, name, credibility_score, accuracy_rate")
        .eq("is_active", true)
        .order("credibility_score", { ascending: false })
        .limit(10);

      // Get bottom 10 sources (falling stars)
      const { data: bottomSources } = await supabase
        .from("sources")
        .select("id, name, credibility_score, accuracy_rate")
        .eq("is_active", true)
        .gte("total_predictions", 5) // Must have at least 5 predictions
        .order("credibility_score", { ascending: true })
        .limit(10);

      return {
        top_sources: topSources || [],
        bottom_sources: bottomSources || []
      };
    });

    return {
      sources_analyzed: sources.length,
      sources_updated: analyses.length,
      significant_changes: significantChanges.length,
      changes: significantChanges.map(c => ({
        name: c.name,
        old_score: c.old_score.toFixed(1),
        new_score: c.new_score.toFixed(1),
        accuracy_rate: c.accuracy_rate.toFixed(1)
      })),
      reputation_shifts: {
        top_performers: reputationShifts.top_sources.slice(0, 5).map((s: any) => ({
          name: s.name,
          score: s.credibility_score.toFixed(1),
          accuracy: s.accuracy_rate.toFixed(1)
        })),
        falling_stars: reputationShifts.bottom_sources.slice(0, 5).map((s: any) => ({
          name: s.name,
          score: s.credibility_score.toFixed(1),
          accuracy: s.accuracy_rate.toFixed(1)
        }))
      }
    };
  }
);
