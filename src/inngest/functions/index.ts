// Multi-source news aggregator (SerpAPI → Tavily → NewsAPI → SearXNG)
export { scanMentionsV2 as scanMentions } from "./scan-mentions-v2.js";
export { detectSpikes } from "./detect-spikes.js";
export { extractPredictions } from "./extract-predictions.js";
export { validatePredictions } from "./validate-predictions.js";
export { generateMarketPost } from "./generate-market-post.js";
export { generateReviewRoundup } from "./generate-review-roundup.js";
export { generateDebateSummary } from "./generate-debate-summary.js";
export { sendSpikeAlerts } from "./send-spike-alerts.js";
export { sendPredictionAlerts } from "./send-prediction-alerts.js";
export { sendDailyDigest } from "./send-daily-digest.js";
export { generatePredictions } from "./generate-predictions.js";
export { validateMLPredictions } from "./validate-ml-predictions.js";

// New background agents
export { monitorMarketConditions } from "./monitor-market-conditions.js";
export { generateMultiSignalAlerts } from "./generate-multi-signal-alerts.js";
export { updateCredibilityScores } from "./update-credibility-scores.js";
export { enrichMarketData } from "./enrich-market-data.js";
export { scanOptionsFlow } from "./scan-options-flow.js";
export { retrainModel } from "./retrain-model.js";
