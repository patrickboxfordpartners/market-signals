import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber, formatDate } from '../../lib/utils';

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  height?: number;
  showVolume?: boolean;
}

export function CandlestickChart({ data, height: heightProp, showVolume = true }: CandlestickChartProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const height = heightProp ?? (isMobile ? 300 : 500);
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      // For candlestick body
      bodyTop: Math.max(d.open, d.close),
      bodyBottom: Math.min(d.open, d.close),
      bodyHeight: Math.abs(d.close - d.open),
      // Wick data
      wickHigh: d.high,
      wickLow: d.low,
      // Color
      isGreen: d.close >= d.open,
    }));
  }, [data]);

  const priceRange = useMemo(() => {
    const prices = data.flatMap((d) => [d.high, d.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.05;
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const changePercent = ((data.close - data.open) / data.open) * 100;

    return (
      <div className="bg-card border border-divider rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-foreground mb-2">
          {formatDate(data.date)}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono text-foreground">${formatNumber(data.open, 2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono text-green-600">${formatNumber(data.high, 2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono text-red-600">${formatNumber(data.low, 2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Close:</span>
            <span className="font-mono text-foreground">${formatNumber(data.close, 2)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-divider">
            <span className="text-muted-foreground">Change:</span>
            <span
              className={`font-mono font-semibold ${
                changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {changePercent >= 0 ? '+' : ''}
              {formatNumber(changePercent, 2)}%
            </span>
          </div>
          {showVolume && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-mono text-foreground">
                {formatNumber(data.volume, 0)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Custom candlestick shape
  const Candlestick = (props: any) => {
    const { x, y, width, payload, height: barHeight } = props;
    const centerX = x + width / 2;

    // Wick (high-low line)
    const wickTop = y + (priceRange.max - payload.high) * (barHeight / (priceRange.max - priceRange.min));
    const wickBottom = y + (priceRange.max - payload.low) * (barHeight / (priceRange.max - priceRange.min));

    // Body
    const bodyTop = y + (priceRange.max - payload.bodyTop) * (barHeight / (priceRange.max - priceRange.min));
    const bodyHeight = Math.max(
      ((payload.bodyHeight) * barHeight) / (priceRange.max - priceRange.min),
      1
    );

    const color = payload.isGreen ? '#22c55e' : '#ef4444';

    return (
      <g>
        {/* Wick */}
        <line
          x1={centerX}
          y1={wickTop}
          x2={centerX}
          y2={wickBottom}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x + 1}
          y={bodyTop}
          width={width - 2}
          height={bodyHeight}
          fill={payload.isGreen ? color : 'transparent'}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => formatDate(date, 'MMM dd')}
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            domain={[priceRange.min, priceRange.max]}
            tickFormatter={(value) => `$${value}`}
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
            yAxisId="price"
          />
          {showVolume && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
          )}
          <Tooltip content={<CustomTooltip />} />

          {/* Candlesticks */}
          <Bar dataKey="bodyHeight" shape={<Candlestick />} yAxisId="price" />

          {/* Volume bars */}
          {showVolume && (
            <Bar dataKey="volume" yAxisId="volume" opacity={0.3}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isGreen ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
