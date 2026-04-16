/**
 * Financial Modeling Prep (FMP) API Client
 * https://site.financialmodelingprep.com/developer/docs
 */

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = import.meta.env.FMP_API_KEY || 'demo'; // Use demo key for development

export interface StockQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  timestamp: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  unadjustedVolume: number;
  change: number;
  changePercent: number;
  vwap: number;
  label: string;
  changeOverTime: number;
}

export interface KeyMetrics {
  date: string;
  symbol: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  marketCap: number;
  enterpriseValue: number;
  peRatio: number;
  priceToSalesRatio: number;
  pocfratio: number;
  pfcfRatio: number;
  pbRatio: number;
  ptbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToEquity: number;
  debtToAssets: number;
  netDebtToEBITDA: number;
  currentRatio: number;
  interestCoverage: number;
  incomeQuality: number;
  dividendYield: number;
  payoutRatio: number;
  salesGeneralAndAdministrativeToRevenue: number;
  researchAndDdevelopementToRevenue: number;
  intangiblesToTotalAssets: number;
  capexToOperatingCashFlow: number;
  capexToRevenue: number;
  capexToDepreciation: number;
  stockBasedCompensationToRevenue: number;
  grahamNumber: number;
  roic: number;
  returnOnTangibleAssets: number;
  grahamNetNet: number;
  workingCapital: number;
  tangibleAssetValue: number;
  netCurrentAssetValue: number;
  investedCapital: number;
  averageReceivables: number;
  averagePayables: number;
  averageInventory: number;
  daysSalesOutstanding: number;
  daysPayablesOutstanding: number;
  daysOfInventoryOnHand: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  roe: number;
  capexPerShare: number;
}

export interface IncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
  link: string;
  finalLink: string;
}

export interface EarningCalendar {
  date: string;
  symbol: string;
  eps: number;
  epsEstimated: number;
  time: string;
  revenue: number;
  revenueEstimated: number;
  updatedFromDate: string;
  fiscalDateEnding: string;
}

export interface StockNews {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

class FMPClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = FMP_API_KEY;
    this.baseUrl = FMP_BASE_URL;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get real-time stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote[]> {
    return this.fetch<StockQuote[]>(`/quote/${symbol}`);
  }

  /**
   * Get historical daily prices
   * @param symbol - Stock symbol
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   */
  async getHistoricalPrices(
    symbol: string,
    from?: string,
    to?: string
  ): Promise<{ historical: HistoricalPrice[] }> {
    let endpoint = `/historical-price-full/${symbol}`;

    if (from && to) {
      endpoint += `?from=${from}&to=${to}`;
    }

    return this.fetch(endpoint);
  }

  /**
   * Get intraday prices (1min, 5min, 15min, 30min, 1hour, 4hour)
   */
  async getIntradayPrices(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour' = '15min'
  ): Promise<HistoricalPrice[]> {
    return this.fetch<HistoricalPrice[]>(`/historical-chart/${interval}/${symbol}`);
  }

  /**
   * Get key financial metrics (P/E, P/S, ROE, etc.)
   */
  async getKeyMetrics(symbol: string, period: 'annual' | 'quarter' = 'annual', limit = 10): Promise<KeyMetrics[]> {
    return this.fetch<KeyMetrics[]>(`/key-metrics/${symbol}?period=${period}&limit=${limit}`);
  }

  /**
   * Get income statements
   */
  async getIncomeStatement(
    symbol: string,
    period: 'annual' | 'quarter' = 'annual',
    limit = 10
  ): Promise<IncomeStatement[]> {
    return this.fetch<IncomeStatement[]>(`/income-statement/${symbol}?period=${period}&limit=${limit}`);
  }

  /**
   * Get earnings calendar for a specific symbol
   */
  async getEarningsCalendar(symbol: string): Promise<EarningCalendar[]> {
    return this.fetch<EarningCalendar[]>(`/historical/earning_calendar/${symbol}`);
  }

  /**
   * Get latest news for symbols
   */
  async getStockNews(symbols: string[], limit = 50): Promise<StockNews[]> {
    const tickers = symbols.join(',');
    return this.fetch<StockNews[]>(`/stock_news?tickers=${tickers}&limit=${limit}`);
  }

  /**
   * Get company profile
   */
  async getProfile(symbol: string): Promise<any> {
    return this.fetch(`/profile/${symbol}`);
  }
}

export const fmpClient = new FMPClient();
