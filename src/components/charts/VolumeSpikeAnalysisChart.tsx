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
} from 'recharts';
import { formatNumber, formatDate } from '../../lib/utils';

export interface VolumeSpikeDataPoint {
  date: string;
  volume: number;
  mentionCount: number;
  volumeSpike: boolean;
  mentionSpike: boolean;
}

interface VolumeSpikeAnalysisChartProps {
  data: VolumeSpikeDataPoint[];
  height?: number;
}

export function VolumeSpikeAnalysisChart({ data, height = 500 }: VolumeSpikeAnalysisChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    // Calculate average volume and mention count for spike detection
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    const avgMentions = data.reduce((sum, d) => sum + d.mentionCount, 0) / data.length;

    // Normalize volumes and mentions to 0-100 scale for comparison
    const maxVolume = Math.max(...data.map((d) => d.volume));
    const maxMentions = Math.max(...data.map((d) => d.mentionCount));

    return data.map((d) => ({
      date: d.date,
      volume: d.volume,
      mentionCount: d.mentionCount,
      normalizedVolume: (d.volume / maxVolume) * 100,
      normalizedMentions: (d.mentionCount / maxMentions) * 100,
      volumeSpike: d.volume > avgVolume * 1.5,
      mentionSpike: d.mentionCount > avgMentions * 1.5,
      correlation: d.volumeSpike && d.mentionSpike,
    }));
  }, [data]);

  // Calculate correlation metrics
  const correlationStats = useMemo(() => {
    const correlatedSpikes = chartData.filter((d) => d.correlation).length;
    const totalVolumeSpikes = chartData.filter((d) => d.volumeSpike).length;
    const totalMentionSpikes = chartData.filter((d) => d.mentionSpike).length;

    return {
      correlatedSpikes,
      totalVolumeSpikes,
      totalMentionSpikes,
      correlationRate: totalVolumeSpikes > 0 ? (correlatedSpikes / totalVolumeSpikes) * 100 : 0,
    };
  }, [chartData]);

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
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-mono text-foreground">{formatNumber(data.volume)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Mentions:</span>
            <span className="font-mono text-foreground">{data.mentionCount}</span>
          </div>
          {data.volumeSpike && (
            <div className="text-orange-500 font-semibold pt-1 border-t border-divider">
              📈 Volume Spike
            </div>
          )}
          {data.mentionSpike && (
            <div className="text-blue-500 font-semibold">
              💬 Mention Spike
            </div>
          )}
          {data.correlation && (
            <div className="text-green-500 font-semibold">
              ✓ Correlated Event
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Volume & Mention Spike Analysis</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Correlation between trading volume spikes and social media mention spikes
        </p>
      </div>

      {/* Correlation Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Volume Spikes</div>
          <div className="text-2xl font-bold font-mono text-orange-500">
            {correlationStats.totalVolumeSpikes}
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Mention Spikes</div>
          <div className="text-2xl font-bold font-mono text-blue-500">
            {correlationStats.totalMentionSpikes}
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Correlated Events</div>
          <div className="text-2xl font-bold font-mono text-green-500">
            {correlationStats.correlatedSpikes}
          </div>
        </div>
        <div className="bg-accent/30 border border-divider rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Correlation Rate</div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatNumber(correlationStats.correlationRate, 0)}%
          </div>
        </div>
      </div>

      {/* Dual-axis chart */}
      <div className="bg-card border border-divider rounded-lg p-4">
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
              yAxisId="volume"
              orientation="left"
              tickFormatter={(value) => formatNumber(value / 1000000) + 'M'}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Trading Volume', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="mentions"
              orientation="right"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Mentions', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#f97316"
              fillOpacity={0.6}
              name="Trading Volume"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="mentions"
              type="monotone"
              dataKey="mentionCount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.correlation) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#22c55e"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }
                return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
              }}
              name="Social Mentions"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-accent/30 border border-divider rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Key Insights</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>
            • <span className="text-orange-500 font-semibold">Volume spikes</span> occur when trading volume exceeds 1.5x the average
          </li>
          <li>
            • <span className="text-blue-500 font-semibold">Mention spikes</span> occur when social mentions exceed 1.5x the average
          </li>
          <li>
            • <span className="text-green-500 font-semibold">Correlated events</span> (green dots) indicate both spikes occurred simultaneously
          </li>
          <li>
            • High correlation suggests social sentiment may predict or react to trading activity
          </li>
        </ul>
      </div>
    </div>
  );
}
