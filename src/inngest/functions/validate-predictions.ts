import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const ALPHA_VANTAGE_API_KEY = process.env.VITE_ALPHA_VANTAGE_API_KEY;

interface StockPrice {
  symbol: string;
  price: number;
  timestamp: string;
}

export const validatePredictions = inngest.createFunction(
  {
    id: "validate-predictions",
    name: "Validate predictions against actual outcomes",
    triggers: [{ cron: "0 21 * * *" }],
  },
  async ({ step }) => {
    const today = new Date();

    // Find predictions that need validation
    const predictionsToValidate = await step.run("fetch-predictions-due", async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(
          `
          id,
          ticker_id,
          source_id,
          sentiment,
          price_target,
          timeframe_days,
          prediction_date,
          target_date
        `
        )
        .lte("target_date", today.toISOString())
        .order("target_date", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch ticker symbols for these predictions
      if (!data || data.length === 0) return [];
      const tickerIds = [...new Set(data.map(p => p.ticker_id))];
      const { data: tickers } = await supabase.from("tickers").select("id, symbol").in("id", tickerIds);
      const tickerMap = new Map((tickers || []).map(t => [t.id, t.symbol]));

      return data.map(p => ({
        ...p,
        ticker_symbol: tickerMap.get(p.ticker_id) || "UNKNOWN",
      }));
    });

    if (predictionsToValidate.length === 0) {
      return { message: "No predictions due for validation" };
    }

    // Get unique ticker symbols
    const symbols = [...new Set(predictionsToValidate.map(p => p.ticker_symbol))];

    // Fetch current prices for all symbols
    const currentPrices = await step.run("fetch-current-prices", async () => {
      const prices: Record<string, StockPrice> = {};

      for (const symbol of symbols) {
        try {
          const price = await fetchStockPrice(symbol);
          prices[symbol] = price;

          // Alpha Vantage free tier: 5 requests per minute
          await new Promise(resolve => setTimeout(resolve, 12000));
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
        }
      }

      return prices;
    });

    // Fetch historical prices at prediction date
    const historicalPrices = await step.run("fetch-historical-prices", async () => {
      const prices: Record<string, Record<string, number>> = {};

      for (const prediction of predictionsToValidate) {
        const symbol = prediction.ticker_symbol;
        const predictionDate = new Date(prediction.prediction_date)
          .toISOString()
          .split("T")[0];

        if (!prices[symbol]) {
          prices[symbol] = {};
        }

        if (!prices[symbol][predictionDate]) {
          try {
            const price = await fetchHistoricalPrice(symbol, predictionDate);
            prices[symbol][predictionDate] = price;

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 12000));
          } catch (error) {
            console.error(
              `Error fetching historical price for ${symbol} on ${predictionDate}:`,
              error
            );
          }
        }
      }

      return prices;
    });

    // Validate each prediction
    const validated = await step.run("validate-and-store", async () => {
      let validationCount = 0;

      for (const prediction of predictionsToValidate) {
        const symbol = prediction.ticker_symbol;
        const predictionDate = new Date(prediction.prediction_date)
          .toISOString()
          .split("T")[0];

        const currentPrice = currentPrices[symbol]?.price;
        const priceAtPrediction = historicalPrices[symbol]?.[predictionDate];

        if (!currentPrice || !priceAtPrediction) {
          console.warn(`Missing price data for ${symbol}, skipping validation`);
          continue;
        }

        // Calculate outcome
        const priceChangePercent =
          ((currentPrice - priceAtPrediction) / priceAtPrediction) * 100;

        // Determine if prediction was correct
        let wasCorrect = false;
        let accuracyScore = 0;

        if (prediction.sentiment === "bullish") {
          wasCorrect = priceChangePercent > 0;
          accuracyScore = Math.min(100, Math.max(0, 50 + priceChangePercent * 5));
        } else if (prediction.sentiment === "bearish") {
          wasCorrect = priceChangePercent < 0;
          accuracyScore = Math.min(100, Math.max(0, 50 + Math.abs(priceChangePercent) * 5));
        } else {
          // Neutral prediction
          wasCorrect = Math.abs(priceChangePercent) < 5;
          accuracyScore = Math.max(0, 100 - Math.abs(priceChangePercent) * 10);
        }

        // If price target was specified, factor that into accuracy
        if (prediction.price_target) {
          const targetAccuracy =
            100 - Math.abs(((currentPrice - prediction.price_target) / prediction.price_target) * 100);
          accuracyScore = (accuracyScore + Math.max(0, targetAccuracy)) / 2;
        }

        // Calculate days to outcome
        const targetDate = prediction.target_date || prediction.prediction_date;
        const daysToOutcome = Math.round(
          (new Date(targetDate).getTime() -
            new Date(prediction.prediction_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // Store validation
        const { error } = await supabase.from("validations").insert({
          prediction_id: prediction.id,
          price_at_prediction: priceAtPrediction,
          price_at_validation: currentPrice,
          price_change_percent: parseFloat(priceChangePercent.toFixed(2)),
          was_correct: wasCorrect,
          accuracy_score: parseFloat(accuracyScore.toFixed(2)),
          days_to_outcome: daysToOutcome,
          validation_date: today.toISOString(),
          validation_method: "target_date_reached",
        });

        if (!error) {
          validationCount++;
        }

        // The trigger will automatically update source credibility
      }

      return { validated: validationCount };
    });

    return {
      predictions_checked: predictionsToValidate.length,
      validations_created: validated.validated,
    };
  }
);

// Fetch current stock price using Alpha Vantage
async function fetchStockPrice(symbol: string): Promise<StockPrice> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  const quote = data["Global Quote"];
  if (!quote || !quote["05. price"]) {
    throw new Error(`No price data for ${symbol}`);
  }

  return {
    symbol,
    price: parseFloat(quote["05. price"]),
    timestamp: quote["07. latest trading day"],
  };
}

// Fetch historical price for a specific date
async function fetchHistoricalPrice(symbol: string, date: string): Promise<number> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  const timeSeries = data["Time Series (Daily)"];
  if (!timeSeries || !timeSeries[date]) {
    throw new Error(`No price data for ${symbol} on ${date}`);
  }

  return parseFloat(timeSeries[date]["4. close"]);
}
