# FMP Integration Guide

## Overview

Market-signals now integrates with Financial Modeling Prep (FMP) API to provide rich financial data and advanced visualizations.

## What's New

### 1. **Price + Prediction Overlay Chart**
Shows actual stock price overlaid with predictions from your sentiment analysis:
- Line chart of historical prices
- Scatter points for predictions (color-coded by sentiment)
- Validation indicators (green border = correct, red = incorrect)
- Hover to see prediction details and reasoning

### 2. **Candlestick Chart**
Professional OHLC (Open, High, Low, Close) candlestick visualization:
- Green candles = price up, Red candles = price down
- Volume bars below price action
- Hover for detailed OHLC data and change percentage

### 3. **Fundamentals Dashboard**
Key financial metrics with sparklines showing trends:
- **Valuation**: P/E Ratio, Revenue, EPS
- **Profitability**: ROE (Return on Equity)
- **Financial Health**: Debt-to-Equity, Current Ratio
- Each metric shows trend vs previous period

## Setup

### 1. Get FMP API Key

**Free Tier** (250 calls/day):
1. Go to https://site.financialmodelingprep.com/developer/docs
2. Sign up for free account
3. Copy your API key

**Paid Tier** ($14/month for 500 calls/day):
- Recommended for production use
- More endpoints and higher rate limits

### 2. Add to Environment

```bash
# Add to .env file
FMP_API_KEY=your_api_key_here
```

**Demo Mode**: The app uses a demo key by default which has limited data and rate limits.

### 3. Test Integration

```bash
npm run dev
```

Visit any ticker detail page (e.g., `/ticker/AAPL`) and you should see:
- Price + Prediction chart
- Candlestick chart
- Fundamentals dashboard

## FMP Data Available

The integration provides access to:

### Real-time Data
- Stock quotes (price, volume, market cap)
- Intraday prices (1min, 5min, 15min, etc.)

### Historical Data  
- Daily historical prices (OHLC + volume)
- Adjustable date ranges (7d, 30d, 90d, all)

### Fundamentals
- Key metrics: P/E, P/S, P/B, ROE, ROIC
- Income statements: Revenue, EPS, margins
- Balance sheet: Debt-to-equity, current ratio
- Cash flow data

### Corporate Actions
- Earnings calendar with estimates
- Company news with timestamps
- SEC filings

## Usage in Code

```typescript
import { useFMPData } from '@/hooks/useFMPData';

function MyComponent() {
  // Fetch 90 days of data for AAPL
  const { quote, historicalPrices, keyMetrics, incomeStatements, loading, error } = 
    useFMPData('AAPL', 90);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Current Price: ${quote?.price}</p>
      <p>P/E Ratio: {keyMetrics[0]?.peRatio}</p>
    </div>
  );
}
```

## API Reference

### FMP Client (`src/lib/fmp.ts`)

```typescript
import { fmpClient } from '@/lib/fmp';

// Get real-time quote
const quote = await fmpClient.getQuote('AAPL');

// Get historical prices
const prices = await fmpClient.getHistoricalPrices('AAPL', '2024-01-01', '2024-12-31');

// Get key metrics
const metrics = await fmpClient.getKeyMetrics('AAPL', 'quarter', 8);

// Get income statements
const income = await fmpClient.getIncomeStatement('AAPL', 'annual', 5);

// Get earnings calendar
const earnings = await fmpClient.getEarningsCalendar('AAPL');

// Get company news
const news = await fmpClient.getStockNews(['AAPL', 'MSFT'], 50);
```

## Chart Components

### PricePredictionChart
```typescript
import { PricePredictionChart } from '@/components/charts/PricePredictionChart';

<PricePredictionChart
  priceData={[
    { date: '2024-01-01', price: 150.00, volume: 1000000 }
  ]}
  predictions={[
    {
      id: '1',
      date: '2024-01-15',
      targetPrice: 160.00,
      sentiment: 'bullish',
      sourceName: 'Analyst X',
      wasCorrect: true,
    }
  ]}
  tickerSymbol="AAPL"
/>
```

### CandlestickChart
```typescript
import { CandlestickChart } from '@/components/charts/CandlestickChart';

<CandlestickChart
  data={[
    {
      date: '2024-01-01',
      open: 150.00,
      high: 152.00,
      low: 149.00,
      close: 151.50,
      volume: 1000000,
    }
  ]}
  showVolume={true}
  height={500}
/>
```

### FundamentalsDashboard
```typescript
import { FundamentalsDashboard } from '@/components/charts/FundamentalsDashboard';

<FundamentalsDashboard
  data={[
    {
      date: '2024-Q1',
      peRatio: 25.5,
      revenue: 100000000,
      eps: 5.50,
      roe: 15.0,
      debtToEquity: 0.5,
      currentRatio: 1.2,
    }
  ]}
  latestQuote={{
    price: 150.00,
    marketCap: 2500000000,
    volume: 1000000,
  }}
/>
```

## Rate Limits

**Free Tier**: 250 calls/day
**Paid Tier**: 500-1000+ calls/day depending on plan

**Optimization Tips**:
- Cache responses in local storage
- Batch requests where possible
- Use appropriate date ranges (don't fetch years of data for every page load)
- Consider adding a Redis cache layer for production

## Future Enhancements

Potential additions for the visual stack:
- News sentiment correlation chart
- Technical indicators (RSI, MACD, Bollinger Bands)
- Earnings surprise chart (actual vs estimated)
- Sector comparison charts
- Analyst ratings aggregation
- Options flow visualization

## Troubleshooting

**"Failed to fetch financial data"**
- Check FMP_API_KEY is set correctly
- Verify API key is active at https://site.financialmodelingprep.com/developer
- Check rate limits haven't been exceeded

**"No data available"**
- Some tickers may not have complete data
- Try a major ticker like AAPL, MSFT, GOOGL first
- Check the ticker symbol is correct

**Charts not rendering**
- Ensure `recharts` is installed: `npm install recharts`
- Check browser console for errors
- Verify data format matches expected types

## License & Attribution

- FMP API: Commercial use allowed with paid plans
- This integration: Boxford Partners proprietary
- OpenBB was evaluated but not used due to AGPL-3.0 licensing restrictions
