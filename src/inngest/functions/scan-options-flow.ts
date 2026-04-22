import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const UNUSUAL_WHALES_API_KEY = process.env.UNUSUAL_WHALES_API_KEY;

interface OptionsFlowItem {
  symbol: string;
  contract_type: "call" | "put";
  strike_price: number;
  expiration_date: string;
  open_interest: number;
  volume: number;
  implied_volatility: number;
  premium: number;
  unusual_score: number;
}

async function fetchUnusualWhalesFlow(symbol: string): Promise<OptionsFlowItem[]> {
  if (!UNUSUAL_WHALES_API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.unusualwhales.com/api/stock/${symbol}/option-contracts?order_by=volume&limit=10`,
      {
        headers: {
          Authorization: `Token ${UNUSUAL_WHALES_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const items: OptionsFlowItem[] = [];

    for (const contract of data.data || []) {
      items.push({
        symbol,
        contract_type: (contract.type || "call").toLowerCase() as "call" | "put",
        strike_price: parseFloat(contract.strike || "0"),
        expiration_date: contract.expiry || "",
        open_interest: parseInt(contract.open_interest || "0"),
        volume: parseInt(contract.volume || "0"),
        implied_volatility: parseFloat(contract.implied_volatility || "0"),
        premium: parseFloat(contract.ask || "0"),
        unusual_score: parseFloat(contract.unusual_activity_score || "0"),
      });
    }

    return items;
  } catch {
    return [];
  }
}

function computeSentiment(item: OptionsFlowItem): "bullish" | "bearish" | "neutral" {
  // High-volume calls with unusual activity = bullish signal
  // High-volume puts with unusual activity = bearish signal
  if (item.unusual_score > 0.7) {
    return item.contract_type === "call" ? "bullish" : "bearish";
  }
  if (item.contract_type === "call" && item.volume > item.open_interest * 0.1) return "bullish";
  if (item.contract_type === "put" && item.volume > item.open_interest * 0.1) return "bearish";
  return "neutral";
}

export const scanOptionsFlow = inngest.createFunction(
  {
    id: "scan-options-flow",
    name: "Scan options flow for unusual activity",
    triggers: [{ cron: "0 */2 * * *" }], // Every 2 hours
  },
  async ({ step }) => {
    if (!UNUSUAL_WHALES_API_KEY) {
      return { status: "skipped", reason: "UNUSUAL_WHALES_API_KEY not configured" };
    }

    const tickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true)
        .limit(30);
      if (error) throw error;
      return data || [];
    });

    if (tickers.length === 0) return { status: "skipped", reason: "No active tickers" };

    let totalInserted = 0;
    const unusualTickers: string[] = [];

    for (const ticker of tickers) {
      const flow = await step.run(`scan-options-${ticker.symbol}`, async () => {
        const items = await fetchUnusualWhalesFlow(ticker.symbol);
        await new Promise(r => setTimeout(r, 500));
        return items;
      });

      if (flow.length === 0) continue;

      const unusualItems = flow.filter(f => f.unusual_score > 0.5 || f.volume > 1000);
      if (unusualItems.length === 0) continue;

      const records = unusualItems.map(item => ({
        ticker_id: ticker.id,
        symbol: ticker.symbol,
        contract_type: item.contract_type,
        strike_price: item.strike_price,
        expiration_date: item.expiration_date || null,
        open_interest: item.open_interest,
        volume: item.volume,
        implied_volatility: item.implied_volatility,
        premium: item.premium,
        sentiment: computeSentiment(item),
        unusual_score: item.unusual_score,
        source: "unusualwhales",
      }));

      const { error } = await supabase.from("options_flow").insert(records);
      if (!error) {
        totalInserted += records.length;
        unusualTickers.push(ticker.symbol);
      }
    }

    // Trigger triple-confirmation check for tickers with unusual options activity
    if (unusualTickers.length > 0) {
      await step.sendEvent("trigger-triple-confirmation", {
        name: "options/unusual-activity-detected",
        data: { symbols: unusualTickers },
      });
    }

    return { status: "completed", tickers_scanned: tickers.length, flow_items_stored: totalInserted, unusual_tickers: unusualTickers };
  }
);
