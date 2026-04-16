import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatNumber, formatDate } from '../../lib/utils';

export interface EarningsDataPoint {
  quarter: string;
  date: string;
  actualEPS: number;
  estimatedEPS: number;
  surprise: number;
  surprisePercent: number;
  priceChange?: number;
}

interface EarningsSurpriseChartProps {
  data: EarningsDataPoint[];
  height?: number;
}

export function EarningsSurpriseChart({ data }: EarningsSurpriseChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      beatEstimate: d.actualEPS > d.estimatedEPS,
      missedEstimate: d.actualEPS < d.estimatedEPS,
      metEstimate: d.actualEPS === d.estimatedEPS,
    }));
  }, [data]);

  // Calculate accuracy stats
  const stats = useMemo(() => {
    const beats = chartData.filter((d) => d.beatEstimate).length;
    const misses = chartData.filter((d) => d.missedEstimate).length;
    const meets = chartData.filter((d) => d.metEstimate).length;
    const total = chartData.length;

    const avgSurprise = chartData.reduce((sum, d) => sum + d.surprisePercent, 0) / total;
    const avgPriceChange = chartData.filter((d) => d.priceChange !== undefined)
      .reduce((sum, d) => sum + (d.priceChange || 0), 0) / total;

    return {
      beats,
      misses,
      meets,
      total,
      beatRate: total > 0 ? (beats / total) * 100 : 0,
      avgSurprise: isNaN(avgSurprise) ? 0 : avgSurprise,
      avgPriceChange: isNaN(avgPriceChange) ? 0 : avgPriceChange,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-card border border-divider rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-foreground mb-2">
          {data.quarter} • {formatDate(data.date)}
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Actual EPS:</span>
            <span className="font-mono text-foreground font-semibold">${formatNumber(data.actualEPS, 2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Estimated EPS:</span>
            <span className="font-mono text-muted-foreground">${formatNumber(data.estimatedEPS, 2)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1.5 border-t border-divider">
            <span className="text-muted-foreground">Surprise:</span>
            <span className={`font-mono font-semibold ${
              data.surprise > 0 ? 'text-green-500' : data.surprise < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {data.surprise > 0 ? '+' : ''}{formatNumber(data.surprisePercent, 1)}%
            </span>
          </div>
          {data.priceChange !== undefined && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Price Change:</span>
              <span className={`font-mono font-semibold ${
                data.priceChange > 0 ? 'text-green-500' : data.priceChange < 0 ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {data.priceChange > 0 ? '+' : ''}{formatNumber(data.priceChange, 2)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Earnings Surprise Analysis</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Actual vs Estimated EPS with price reaction
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Reports</div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {stats.total}
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Beat Estimate</div>
          <div className="text-2xl font-bold font-mono text-green-500">
            {stats.beats}
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Missed Estimate</div>
          <div className="text-2xl font-bold font-mono text-red-500">
            {stats.misses}
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Beat Rate</div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatNumber(stats.beatRate, 0)}%
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Avg Surprise</div>
          <div className={`text-2xl font-bold font-mono ${
            stats.avgSurprise > 0 ? 'text-green-500' : stats.avgSurprise < 0 ? 'text-red-500' : 'text-foreground'
          }`}>
            {stats.avgSurprise > 0 ? '+' : ''}{formatNumber(stats.avgSurprise, 1)}%
          </div>
        </div>
      </div>

      {/* Actual vs Estimated Chart */}
      <div className="bg-card border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">EPS: Actual vs Estimated</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="quarter"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'EPS', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="estimatedEPS"
              fill="#6b7280"
              fillOpacity={0.4}
              name="Estimated EPS"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actualEPS"
              name="Actual EPS"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.beatEstimate ? '#22c55e' : entry.missedEstimate ? '#ef4444' : '#6b7280'}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Surprise Percentage Chart */}
      <div className="bg-card border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Earnings Surprise %</h4>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="quarter"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Bar
              dataKey="surprisePercent"
              name="Surprise %"
              radius={[4, 4, 4, 4]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.surprisePercent > 0 ? '#22c55e' : entry.surprisePercent < 0 ? '#ef4444' : '#6b7280'}
                />
              ))}
            </Bar>
            {chartData.some((d) => d.priceChange !== undefined) && (
              <Line
                type="monotone"
                dataKey="priceChange"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Price Change %"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-accent/30 border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Key Insights</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>
            • <span className="text-green-500 font-semibold">Beat rate: {formatNumber(stats.beatRate, 0)}%</span> -
            Company exceeded analyst expectations in {stats.beats} out of {stats.total} quarters
          </li>
          <li>
            • <span className="text-foreground font-semibold">Average surprise: {stats.avgSurprise > 0 ? '+' : ''}{formatNumber(stats.avgSurprise, 1)}%</span> -
            {stats.avgSurprise > 0
              ? ' Company consistently beats estimates'
              : stats.avgSurprise < 0
              ? ' Company consistently misses estimates'
              : ' Company meets estimates on average'}
          </li>
          {stats.avgPriceChange !== 0 && (
            <li>
              • <span className="text-blue-500 font-semibold">Average price change: {stats.avgPriceChange > 0 ? '+' : ''}{formatNumber(stats.avgPriceChange, 2)}%</span> -
              Average stock movement following earnings announcements
            </li>
          )}
          <li>
            • Earnings surprises often correlate with short-term price movements
          </li>
        </ul>
      </div>
    </div>
  );
}
