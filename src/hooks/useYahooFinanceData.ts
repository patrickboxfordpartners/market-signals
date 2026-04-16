import { useEffect, useState } from 'react';
import { yahooFinanceClient } from '../lib/yahooFinance';
import type { StockQuote, HistoricalPrice, Fundamentals } from '../lib/yahooFinance';

export interface YahooFinanceData {
  quote: StockQuote | null;
  historicalPrices: HistoricalPrice[];
  fundamentals: Fundamentals | null;
  loading: boolean;
  error: string | null;
}

export function useYahooFinanceData(symbol: string, daysBack: number = 90) {
  const [data, setData] = useState<YahooFinanceData>({
    quote: null,
    historicalPrices: [],
    fundamentals: null,
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
          fundamentals: null,
          loading: false,
          error: 'No symbol provided',
        });
        return;
      }

      setData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const endDate = new Date();

        const [quote, historical, fundamentals] = await Promise.all([
          yahooFinanceClient.getQuote(symbol),
          yahooFinanceClient.getHistoricalPrices(symbol, startDate, endDate),
          yahooFinanceClient.getFundamentals(symbol),
        ]);

        if (cancelled) return;

        setData({
          quote,
          historicalPrices: historical,
          fundamentals,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        if (cancelled) return;

        console.error('Yahoo Finance data fetch error:', err);
        setData({
          quote: null,
          historicalPrices: [],
          fundamentals: null,
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
