/**
 * Yahoo Finance API Client
 * Free alternative to FMP with no API key required
 */

import yahooFinance from 'yahoo-finance2';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  pe: number;
  eps: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface Fundamentals {
  symbol: string;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  trailingEps: number;
  forwardEps: number;
  bookValue: number;
  priceToBook: number;
  revenue: number;
  revenuePerShare: number;
  profitMargin: number;
  operatingMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  grossMargins: number;
  ebitdaMargins: number;
}

class YahooFinanceClient {
  /**
   * Get real-time stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const quote = await yahooFinance.quote(symbol);

      if (!quote) return null;

      return {
        symbol: quote.symbol,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        dayLow: quote.regularMarketDayLow || 0,
        dayHigh: quote.regularMarketDayHigh || 0,
        yearHigh: quote.fiftyTwoWeekHigh || 0,
        yearLow: quote.fiftyTwoWeekLow || 0,
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0,
        avgVolume: quote.averageDailyVolume3Month || 0,
        open: quote.regularMarketOpen || 0,
        previousClose: quote.regularMarketPreviousClose || 0,
        pe: quote.trailingPE || 0,
        eps: quote.epsTrailingTwelveMonths || 0,
        fiftyDayAvg: quote.fiftyDayAverage || 0,
        twoHundredDayAvg: quote.twoHundredDayAverage || 0,
      };
    } catch (error) {
      console.error(`Yahoo Finance quote error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get historical daily prices
   */
  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<HistoricalPrice[]> {
    try {
      const result = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      return result.map((item) => ({
        date: item.date.toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        adjClose: item.adjClose || item.close,
      }));
    } catch (error) {
      console.error(`Yahoo Finance historical error for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get company fundamentals
   */
  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    try {
      const quoteSummary = await yahooFinance.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'],
      });

      const keyStats = quoteSummary.defaultKeyStatistics;
      const financial = quoteSummary.financialData;
      const summary = quoteSummary.summaryDetail;

      if (!keyStats || !financial || !summary) return null;

      return {
        symbol,
        marketCap: summary.marketCap || 0,
        peRatio: summary.trailingPE || 0,
        forwardPE: summary.forwardPE || 0,
        trailingEps: keyStats.trailingEps || 0,
        forwardEps: keyStats.forwardEps || 0,
        bookValue: keyStats.bookValue || 0,
        priceToBook: keyStats.priceToBook || 0,
        revenue: financial.totalRevenue || 0,
        revenuePerShare: keyStats.revenuePerShare || 0,
        profitMargin: financial.profitMargins || 0,
        operatingMargin: financial.operatingMargins || 0,
        returnOnAssets: financial.returnOnAssets || 0,
        returnOnEquity: financial.returnOnEquity || 0,
        debtToEquity: financial.debtToEquity || 0,
        currentRatio: financial.currentRatio || 0,
        quickRatio: financial.quickRatio || 0,
        grossMargins: financial.grossMargins || 0,
        ebitdaMargins: financial.ebitdaMargins || 0,
      };
    } catch (error) {
      console.error(`Yahoo Finance fundamentals error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get earnings history
   */
  async getEarnings(symbol: string) {
    try {
      const quoteSummary = await yahooFinance.quoteSummary(symbol, {
        modules: ['earnings', 'earningsHistory'],
      });

      return {
        earnings: quoteSummary.earnings,
        history: quoteSummary.earningsHistory,
      };
    } catch (error) {
      console.error(`Yahoo Finance earnings error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Search for stocks by query
   */
  async search(query: string) {
    try {
      const results = await yahooFinance.search(query);
      return results.quotes || [];
    } catch (error) {
      console.error('Yahoo Finance search error:', error);
      return [];
    }
  }
}

export const yahooFinanceClient = new YahooFinanceClient();
