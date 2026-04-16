import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { formatNumber, formatDate } from '../../lib/utils';

export interface PriceDataPoint {
  date: string;
  close: number;
  volume?: number;
}

interface TechnicalIndicatorsChartProps {
  data: PriceDataPoint[];
  height?: number;
}

// Calculate Simple Moving Average
function calculateSMA(data: PriceDataPoint[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// Calculate Exponential Moving Average
function calculateEMA(data: PriceDataPoint[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let ema = data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i].close - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  return result;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(data: PriceDataPoint[], period: number = 14): number[] {
  const result: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const recentChanges = changes.slice(i - period, i);
      const gains = recentChanges.filter((c) => c > 0).reduce((acc, c) => acc + c, 0) / period;
      const losses = Math.abs(recentChanges.filter((c) => c < 0).reduce((acc, c) => acc + c, 0)) / period;

      if (losses === 0) {
        result.push(100);
      } else {
        const rs = gains / losses;
        result.push(100 - 100 / (1 + rs));
      }
    }
  }
  return result;
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(data: PriceDataPoint[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }

  // Signal line is 9-day EMA of MACD
  const macdData = macdLine.map((value, i) => ({ date: data[i].date, close: value }));
  const signalLine = calculateEMA(
    macdData.filter((d) => !isNaN(d.close)),
    9
  );

  // Pad signal line with NaN to match length
  const paddedSignal: number[] = new Array(data.length).fill(NaN);
  let signalIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(macdLine[i])) {
      paddedSignal[i] = signalLine[signalIndex] || NaN;
      signalIndex++;
    }
  }

  return { macdLine, signalLine: paddedSignal };
}

export function TechnicalIndicatorsChart({ data }: TechnicalIndicatorsChartProps) {
  const chartData = useMemo(() => {
    const sma20 = calculateSMA(data, 20);
    const sma50 = calculateSMA(data, 50);
    const ema12 = calculateEMA(data, 12);
    const rsi = calculateRSI(data, 14);
    const { macdLine, signalLine } = calculateMACD(data);

    return data.map((d, i) => ({
      date: d.date,
      price: d.close,
      sma20: sma20[i],
      sma50: sma50[i],
      ema12: ema12[i],
      rsi: rsi[i],
      macd: macdLine[i],
      signal: signalLine[i],
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-card border border-divider rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-foreground mb-2">
          {formatDate(data.date)}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-mono text-foreground">${formatNumber(data.price, 2)}</span>
          </div>
          {!isNaN(data.sma20) && (
            <div className="flex justify-between gap-4">
              <span className="text-blue-500">SMA(20):</span>
              <span className="font-mono text-foreground">${formatNumber(data.sma20, 2)}</span>
            </div>
          )}
          {!isNaN(data.sma50) && (
            <div className="flex justify-between gap-4">
              <span className="text-purple-500">SMA(50):</span>
              <span className="font-mono text-foreground">${formatNumber(data.sma50, 2)}</span>
            </div>
          )}
          {!isNaN(data.rsi) && (
            <div className="flex justify-between gap-4 pt-1 border-t border-divider">
              <span className="text-muted-foreground">RSI(14):</span>
              <span className={`font-mono ${data.rsi > 70 ? 'text-red-500' : data.rsi < 30 ? 'text-green-500' : 'text-foreground'}`}>
                {formatNumber(data.rsi, 2)}
              </span>
            </div>
          )}
          {!isNaN(data.macd) && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">MACD:</span>
              <span className="font-mono text-foreground">{formatNumber(data.macd, 4)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Technical Indicators</h3>

      {/* Price with Moving Averages */}
      <div className="bg-card border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Price & Moving Averages</h4>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatDate(date, 'MMM dd')}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Price"
            />
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              name="SMA(20)"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="sma50"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              name="SMA(50)"
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI */}
      <div className="bg-card border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          RSI (Relative Strength Index)
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          RSI &gt; 70 = Overbought (potential sell) | RSI &lt; 30 = Oversold (potential buy)
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatDate(date, 'MMM dd')}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              domain={[0, 100]}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Overbought zone */}
            <Area
              type="monotone"
              dataKey={() => 100}
              fill="#ef444420"
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey={() => 70}
              fill="#ffffff"
              stroke="none"
            />
            {/* Oversold zone */}
            <Area
              type="monotone"
              dataKey={() => 30}
              fill="#22c55e20"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="RSI(14)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD */}
      <div className="bg-card border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          MACD (Moving Average Convergence Divergence)
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          MACD above Signal = Bullish | MACD below Signal = Bearish
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatDate(date, 'MMM dd')}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="macd"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="MACD"
            />
            <Line
              type="monotone"
              dataKey="signal"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Signal"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
