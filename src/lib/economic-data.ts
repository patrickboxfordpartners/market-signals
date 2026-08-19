/**
 * Economic Data Integration
 * Fetch macro indicators from FRED, World Bank, and IMF APIs
 */

export interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  source: "fred" | "worldbank" | "imf";
  category: "rates" | "inflation" | "employment" | "gdp" | "sentiment" | "markets";
}

export interface MacroOverview {
  fedFundsRate: EconomicIndicator | null;
  cpi: EconomicIndicator | null;
  unemploymentRate: EconomicIndicator | null;
  gdpGrowth: EconomicIndicator | null;
  sp500: EconomicIndicator | null;
  vix: EconomicIndicator | null;
  lastUpdated: string;
}

// FRED API Configuration - now proxied through Supabase Edge Function
import { supabase } from '../integrations/supabase/client';

// Common FRED series IDs
const FRED_SERIES = {
  FED_FUNDS_RATE: "DFF", // Daily Federal Funds Effective Rate
  CPI: "CPIAUCSL", // Consumer Price Index for All Urban Consumers
  UNEMPLOYMENT: "UNRATE", // Unemployment Rate
  GDP: "A191RL1Q225SBEA", // Real GDP Growth (quarterly)
  SP500: "SP500", // S&P 500 Index
  VIX: "VIXCLS", // CBOE Volatility Index
  PCE: "PCE", // Personal Consumption Expenditures
  RETAIL_SALES: "RSXFS", // Retail Sales
  HOUSING_STARTS: "HOUST", // Housing Starts
  INDUSTRIAL_PRODUCTION: "INDPRO", // Industrial Production Index
};

/**
 * Fetch a single series from FRED
 */
async function fetchFREDSeries(
  seriesId: string,
  name: string,
  category: EconomicIndicator["category"]
): Promise<EconomicIndicator | null> {
  try {
    // Call secure Supabase Edge Function proxy
    const { data, error } = await supabase.functions.invoke('fred-proxy', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        series_id: seriesId,
        endpoint: 'series/observations'
      }
    })

    if (error) {
      console.warn(`[economic-data] FRED proxy error: ${error.message}`)
      return null
    }

    if (!data.observations || data.observations.length === 0) {
      return null;
    }

    const latest = data.observations[0];

    return {
      id: seriesId,
      name,
      value: parseFloat(latest.value),
      unit: getUnitForSeries(seriesId),
      date: latest.date,
      source: "fred",
      category,
    };
  } catch (error: any) {
    console.error(`[economic-data] Error fetching ${seriesId}:`, error.message);
    return null;
  }
}

/**
 * Get unit/format for a series
 */
function getUnitForSeries(seriesId: string): string {
  const units: Record<string, string> = {
    DFF: "%",
    CPIAUCSL: "Index",
    UNRATE: "%",
    A191RL1Q225SBEA: "%",
    SP500: "Points",
    VIXCLS: "Index",
    PCE: "Billions $",
    RSXFS: "Millions $",
    HOUST: "Thousands",
    INDPRO: "Index",
  };
  return units[seriesId] || "";
}

/**
 * Fetch macro economic overview (key indicators)
 */
export async function fetchMacroOverview(): Promise<MacroOverview> {
  const [fedFunds, cpi, unemployment, gdp, sp500, vix] = await Promise.all([
    fetchFREDSeries(FRED_SERIES.FED_FUNDS_RATE, "Fed Funds Rate", "rates"),
    fetchFREDSeries(FRED_SERIES.CPI, "CPI (Inflation)", "inflation"),
    fetchFREDSeries(FRED_SERIES.UNEMPLOYMENT, "Unemployment Rate", "employment"),
    fetchFREDSeries(FRED_SERIES.GDP, "Real GDP Growth", "gdp"),
    fetchFREDSeries(FRED_SERIES.SP500, "S&P 500", "markets"),
    fetchFREDSeries(FRED_SERIES.VIX, "VIX (Volatility)", "sentiment"),
  ]);

  return {
    fedFundsRate: fedFunds,
    cpi,
    unemploymentRate: unemployment,
    gdpGrowth: gdp,
    sp500,
    vix,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch detailed economic indicators by category
 */
export async function fetchEconomicIndicatorsByCategory(
  category: EconomicIndicator["category"]
): Promise<EconomicIndicator[]> {
  const categoryMap: Record<EconomicIndicator["category"], Array<[string, string]>> = {
    rates: [
      [FRED_SERIES.FED_FUNDS_RATE, "Fed Funds Rate"],
    ],
    inflation: [
      [FRED_SERIES.CPI, "Consumer Price Index"],
      [FRED_SERIES.PCE, "Personal Consumption Expenditures"],
    ],
    employment: [
      [FRED_SERIES.UNEMPLOYMENT, "Unemployment Rate"],
    ],
    gdp: [
      [FRED_SERIES.GDP, "Real GDP Growth"],
    ],
    sentiment: [
      [FRED_SERIES.VIX, "VIX Volatility Index"],
    ],
    markets: [
      [FRED_SERIES.SP500, "S&P 500 Index"],
    ],
  };

  const series = categoryMap[category] || [];

  const results = await Promise.all(
    series.map(([id, name]) => fetchFREDSeries(id, name, category))
  );

  return results.filter((r): r is EconomicIndicator => r !== null);
}

/**
 * Fetch historical data for a series (for charting)
 */
export async function fetchHistoricalSeries(
  _seriesId: string,
  _startDate: string,
  _endDate: string
): Promise<Array<{ date: string; value: number }>> {
  // Note: Historical data not yet implemented via proxy
  // Would need additional endpoint parameter support in fred-proxy
  console.warn("[economic-data] Historical series not yet supported via proxy");
  return [];
}

/**
 * Get economic context for AI analysis
 */
export async function getEconomicContextForAI(): Promise<string> {
  const macro = await fetchMacroOverview();

  const parts: string[] = ["Current Economic Environment:"];

  if (macro.fedFundsRate) {
    parts.push(
      `- Federal Funds Rate: ${macro.fedFundsRate.value.toFixed(2)}% (as of ${macro.fedFundsRate.date})`
    );
  }

  if (macro.cpi) {
    parts.push(`- CPI Inflation: ${macro.cpi.value.toFixed(1)} (as of ${macro.cpi.date})`);
  }

  if (macro.unemploymentRate) {
    parts.push(
      `- Unemployment Rate: ${macro.unemploymentRate.value.toFixed(1)}% (as of ${macro.unemploymentRate.date})`
    );
  }

  if (macro.gdpGrowth) {
    parts.push(
      `- Real GDP Growth: ${macro.gdpGrowth.value.toFixed(2)}% (as of ${macro.gdpGrowth.date})`
    );
  }

  if (macro.vix) {
    parts.push(`- Market Volatility (VIX): ${macro.vix.value.toFixed(2)} (as of ${macro.vix.date})`);
  }

  return parts.join("\n");
}
