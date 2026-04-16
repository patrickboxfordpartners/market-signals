import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../../lib/utils';

export interface FundamentalsData {
  date: string;
  peRatio: number;
  revenue: number;
  eps: number;
  roe: number;
  debtToEquity: number;
  currentRatio: number;
  grossProfitMargin?: number;
}

interface FundamentalsDashboardProps {
  data: FundamentalsData[];
  latestQuote?: {
    price: number;
    marketCap: number;
    volume: number;
  };
}

function MetricCard({
  title,
  value,
  change,
  sparklineData,
  icon: Icon,
  format = 'number',
}: {
  title: string;
  value: number;
  change?: number;
  sparklineData?: number[];
  icon: React.ElementType;
  format?: 'number' | 'currency' | 'percent' | 'ratio';
}) {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency':
        return `$${formatNumber(value, 2)}`;
      case 'percent':
        return `${formatNumber(value, 2)}%`;
      case 'ratio':
        return formatNumber(value, 2);
      default:
        return formatNumber(value, 2);
    }
  }, [value, format]);

  const chartData = sparklineData?.map((val, idx) => ({ value: val, index: idx })) || [];

  return (
    <div className="bg-card border border-divider rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">{formattedValue}</p>
        </div>
        <div className="p-2 rounded-lg bg-accent">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1">
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span
            className={`text-xs font-semibold ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? '+' : ''}
            {formatNumber(change, 2)}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">vs last period</span>
        </div>
      )}

      {sparklineData && sparklineData.length > 0 && (
        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function FundamentalsDashboard({ data, latestQuote }: FundamentalsDashboardProps) {
  const latest = data[0];
  const previous = data[1];

  const metrics = useMemo(() => {
    if (!latest) return null;

    const peChange = previous ? ((latest.peRatio - previous.peRatio) / previous.peRatio) * 100 : undefined;
    const revenueChange = previous ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : undefined;
    const epsChange = previous ? ((latest.eps - previous.eps) / previous.eps) * 100 : undefined;
    const roeChange = previous ? ((latest.roe - previous.roe) / previous.roe) * 100 : undefined;

    return {
      peRatio: {
        value: latest.peRatio,
        change: peChange,
        sparkline: data.slice(0, 8).reverse().map((d) => d.peRatio),
      },
      revenue: {
        value: latest.revenue,
        change: revenueChange,
        sparkline: data.slice(0, 8).reverse().map((d) => d.revenue),
      },
      eps: {
        value: latest.eps,
        change: epsChange,
        sparkline: data.slice(0, 8).reverse().map((d) => d.eps),
      },
      roe: {
        value: latest.roe,
        change: roeChange,
        sparkline: data.slice(0, 8).reverse().map((d) => d.roe),
      },
      debtToEquity: {
        value: latest.debtToEquity,
        sparkline: data.slice(0, 8).reverse().map((d) => d.debtToEquity),
      },
      currentRatio: {
        value: latest.currentRatio,
        sparkline: data.slice(0, 8).reverse().map((d) => d.currentRatio),
      },
    };
  }, [data, latest, previous]);

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No fundamental data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Financial Metrics</h3>

      {/* Quick stats if quote available */}
      {latestQuote && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-divider rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Price</p>
            <p className="text-2xl font-bold text-foreground">
              ${formatNumber(latestQuote.price, 2)}
            </p>
          </div>
          <div className="bg-card border border-divider rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
            <p className="text-2xl font-bold text-foreground">
              ${formatNumber(latestQuote.marketCap / 1e9, 2)}B
            </p>
          </div>
          <div className="bg-card border border-divider rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Volume</p>
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(latestQuote.volume / 1e6, 2)}M
            </p>
          </div>
        </div>
      )}

      {/* Valuation Metrics */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Valuation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="P/E Ratio"
            value={metrics.peRatio.value}
            change={metrics.peRatio.change}
            sparklineData={metrics.peRatio.sparkline}
            icon={PieChart}
            format="ratio"
          />
          <MetricCard
            title="Revenue"
            value={metrics.revenue.value}
            change={metrics.revenue.change}
            sparklineData={metrics.revenue.sparkline}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="EPS"
            value={metrics.eps.value}
            change={metrics.eps.change}
            sparklineData={metrics.eps.sparkline}
            icon={TrendingUp}
            format="currency"
          />
        </div>
      </div>

      {/* Profitability & Health */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Profitability & Health</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="ROE"
            value={metrics.roe.value}
            change={metrics.roe.change}
            sparklineData={metrics.roe.sparkline}
            icon={BarChart3}
            format="percent"
          />
          <MetricCard
            title="Debt to Equity"
            value={metrics.debtToEquity.value}
            sparklineData={metrics.debtToEquity.sparkline}
            icon={PieChart}
            format="ratio"
          />
          <MetricCard
            title="Current Ratio"
            value={metrics.currentRatio.value}
            sparklineData={metrics.currentRatio.sparkline}
            icon={BarChart3}
            format="ratio"
          />
        </div>
      </div>
    </div>
  );
}
