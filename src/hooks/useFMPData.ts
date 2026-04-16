import { useEffect, useState } from 'react';
import { fmpClient } from '../lib/fmp';
import type { StockQuote, HistoricalPrice, KeyMetrics, IncomeStatement } from '../lib/fmp';

export interface FMPData {
  quote: StockQuote | null;
  historicalPrices: HistoricalPrice[];
  keyMetrics: KeyMetrics[];
  incomeStatements: IncomeStatement[];
  loading: boolean;
  error: string | null;
}

export function useFMPData(symbol: string, daysBack: number = 90) {
  const [data, setData] = useState<FMPData>({
    quote: null,
    historicalPrices: [],
    keyMetrics: [],
    incomeStatements: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!symbol) {
        setData({
          quote: null,
          historicalPrices: [],
          keyMetrics: [],
          incomeStatements: [],
          loading: false,
          error: 'No symbol provided',
        });
        return;
      }

      setData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - daysBack);

        const [quoteData, historicalData, metricsData, incomeData] = await Promise.all([
          fmpClient.getQuote(symbol),
          fmpClient.getHistoricalPrices(
            symbol,
            fromDate.toISOString().split('T')[0],
            toDate.toISOString().split('T')[0]
          ),
          fmpClient.getKeyMetrics(symbol, 'quarter', 8),
          fmpClient.getIncomeStatement(symbol, 'quarter', 8),
        ]);

        if (cancelled) return;

        setData({
          quote: quoteData[0] || null,
          historicalPrices: historicalData.historical || [],
          keyMetrics: metricsData || [],
          incomeStatements: incomeData || [],
          loading: false,
          error: null,
        });
      } catch (err: any) {
        if (cancelled) return;

        console.error('FMP data fetch error:', err);
        setData({
          quote: null,
          historicalPrices: [],
          keyMetrics: [],
          incomeStatements: [],
          loading: false,
          error: err.message || 'Failed to fetch financial data',
        });
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [symbol, daysBack]);

  return data;
}
