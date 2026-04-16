import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatNumber, formatDate } from '../../lib/utils';

export interface PriceData {
  date: string;
  price: number;
  volume?: number;
}

export interface PredictionPoint {
  id: string;
  date: string;
  targetPrice: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sourceName: string;
  wasCorrect?: boolean | null;
  reasoning?: string;
}

interface PricePredictionChartProps {
  priceData: PriceData[];
  predictions: PredictionPoint[];
  tickerSymbol: string;
  height?: number;
}

export function PricePredictionChart({
  priceData,
  predictions,
  tickerSymbol,
  height = 400,
}: PricePredictionChartProps) {
  // Merge price data with predictions for the chart
  const chartData = useMemo(() => {
    const dataMap = new Map<string, any>();

    // Add price data
    priceData.forEach((p) => {
      dataMap.set(p.date, {
        date: p.date,
        price: p.price,
        volume: p.volume,
      });
    });

    // Add predictions as separate points
    predictions.forEach((pred) => {
      const existing = dataMap.get(pred.date) || { date: pred.date };
      if (!existing.predictions) existing.predictions = [];
      existing.predictions.push(pred);
      dataMap.set(pred.date, existing);
    });

    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [priceData, predictions]);

  // Flatten predictions for scatter plot
  const predictionScatter = useMemo(() => {
    return predictions.map((pred) => ({
      date: pred.date,
      targetPrice: pred.targetPrice,
      sentiment: pred.sentiment,
      wasCorrect: pred.wasCorrect,
      sourceName: pred.sourceName,
      reasoning: pred.reasoning,
    }));
  }, [predictions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const preds = data.predictions || [];

    return (
      <div className="bg-card border border-divider rounded-lg shadow-lg p-3 max-w-xs">
        <p className="text-sm font-semibold text-foreground mb-1">
          {formatDate(data.date)}
        </p>

        {data.price && (
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-lg font-bold text-foreground">
              ${formatNumber(data.price, 2)}
            </p>
          </div>
        )}

        {preds.length > 0 && (
          <div className="space-y-2 border-t border-divider pt-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Predictions
            </p>
            {preds.map((pred: PredictionPoint, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {pred.sourceName}
                  </span>
                  {pred.sentiment === 'bullish' && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {pred.sentiment === 'bearish' && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  {pred.sentiment === 'neutral' && (
                    <Minus className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Target: ${formatNumber(pred.targetPrice, 2)}
                </p>
                {pred.wasCorrect !== null && (
                  <p
                    className={`text-xs font-medium ${
                      pred.wasCorrect ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {pred.wasCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex items-center justify-center gap-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Calculate price range for Y-axis
  const priceRange = useMemo(() => {
    const prices = [...priceData.map((p) => p.price), ...predictions.map((p) => p.targetPrice)];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [priceData, predictions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {tickerSymbol} Price & Predictions
        </h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Bearish</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Neutral</span>
          </div>
        </div>
      </div>

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
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />

          {/* Price line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name="Actual Price"
          />

          {/* Prediction scatter points */}
          <Scatter
            data={predictionScatter}
            dataKey="targetPrice"
            fill="hsl(var(--primary))"
            name="Predictions"
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const color =
                payload.sentiment === 'bullish'
                  ? '#22c55e'
                  : payload.sentiment === 'bearish'
                  ? '#ef4444'
                  : '#eab308';

              // Draw circle with border if validated
              if (payload.wasCorrect !== null) {
                return (
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={color}
                      stroke={payload.wasCorrect ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                    />
                  </>
                );
              }

              return <circle cx={cx} cy={cy} r={5} fill={color} />;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
