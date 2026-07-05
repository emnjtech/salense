"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  HeartPulse,
  Loader2,
  PackageSearch,
  RefreshCcw,
  ShoppingBag,
  Store,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemoModeBanner } from "../demo/demo-mode-banner";
import {
  DashboardClientError,
  createDashboardApiClient,
  type PlatformMetric,
  type RuleBasedInsight,
  type TodayDashboardResponse,
} from "../../lib/api/dashboard-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { readDemoSession } from "../../lib/auth-session";

export function TodayDashboard() {
  const dashboardClient = useMemo(() => createDashboardApiClient(), []);
  const [dashboard, setDashboard] = useState<TodayDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setDashboard(null);
      setError("Sign in as demo@salense.local to view today's seeded business dashboard.");
      setLoading(false);
      return;
    }

    try {
      setDashboard(await dashboardClient.getTodayDashboard(session.accessToken));
    } catch (caughtError) {
      setDashboard(null);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [dashboardClient]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="workspace today-workspace">
      <header className="workspace-header today-header">
        <div>
          <p className="eyebrow">Unified Today</p>
          <h1>Multi-channel commerce intelligence in one daily view.</h1>
          <p>
            Compare WooCommerce, Amazon Seller, TikTok Shop, and Shopify revenue, orders, product
            momentum, stock risk, and Business Health Score without changing source records.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadDashboard()} type="button">
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <DemoModeBanner />

      {loading ? <TodayLoadingState /> : null}
      {!loading && error ? <TodayErrorState message={error} /> : null}
      {!loading && !error && dashboard ? <TodayDashboardContent dashboard={dashboard} /> : null}
    </main>
  );
}

function TodayDashboardContent({ dashboard }: { readonly dashboard: TodayDashboardResponse }) {
  const isEmpty = dashboard.activeStores === 0 && dashboard.todayRevenue === 0;

  return (
    <>
      {isEmpty ? (
        <section className="state-banner warning">
          <Store size={18} aria-hidden="true" />
          Seed the demo data or sync a connected store to populate this daily operating view.
        </section>
      ) : null}

      <section className="today-hero-grid" aria-label="Today dashboard headline">
        <HealthScoreCard score={dashboard.basicBusinessHealthScore} />
        <div className="today-hero-metrics">
          <MetricTile
            label="Today revenue"
            value={formatCurrency(dashboard.todayRevenue)}
            supporting="Across all connected stores"
          />
          <MetricTile
            label="Revenue change"
            value={formatPercent(dashboard.revenueChangePercent)}
            supporting={`Yesterday: ${formatCurrency(dashboard.yesterdayRevenue)}`}
            trend={dashboard.revenueChangePercent}
          />
          <MetricTile
            label="Orders today"
            value={dashboard.ordersToday.toString()}
            supporting={`${dashboard.productsSoldToday} products sold`}
          />
        </div>
      </section>

      <section className="overview-grid" aria-label="Today metrics">
        <MetricTile
          label="Average order value"
          value={formatCurrency(dashboard.averageOrderValueToday)}
          supporting="Today"
        />
        <MetricTile
          label="Refund count"
          value={dashboard.refundCountToday.toString()}
          supporting="Today"
        />
        <MetricTile
          label="Active stores"
          value={dashboard.activeStores.toString()}
          supporting="Connected"
        />
        <MetricTile
          label="Connected platforms"
          value={dashboard.connectedPlatforms.length.toString()}
          supporting={formatPlatformList(dashboard.connectedPlatforms)}
        />
      </section>

      <div className="today-content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Revenue by Platform</h2>
              <p>Amazon, TikTok, and WooCommerce stay separate so channel performance is clear.</p>
            </div>
          </div>
          <PlatformBreakdown
            metrics={dashboard.revenueByPlatform}
            valueFormatter={formatCurrency}
          />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Orders by Platform</h2>
              <p>Today’s source-channel order count for quick comparison.</p>
            </div>
          </div>
          <PlatformBreakdown
            metrics={dashboard.ordersByPlatform}
            valueFormatter={(value) => value.toString()}
          />
        </section>
      </div>

      <div className="today-content-grid">
        <section className="panel today-focus-panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s Focus</h2>
              <p>Best platform, top product, and inventory signal from the seeded commerce data.</p>
            </div>
          </div>
          <div className="focus-list">
            <FocusItem
              icon={<BarChart3 size={18} />}
              label="Best platform"
              value={
                dashboard.bestPlatformToday
                  ? formatPlatform(dashboard.bestPlatformToday)
                  : "No sales yet"
              }
            />
            <FocusItem
              icon={<PackageSearch size={18} />}
              label="Top product"
              value={dashboard.topProductToday?.name ?? "No products sold yet"}
              {...(dashboard.topProductToday
                ? {
                    supporting: `${dashboard.topProductToday.quantitySold} sold · ${formatCurrency(
                      dashboard.topProductToday.revenue,
                    )}`,
                  }
                : {})}
            />
            <FocusItem
              icon={<Boxes size={18} />}
              label="Low stock count"
              value={dashboard.lowStockCount.toString()}
              supporting="Products needing attention"
            />
          </div>
        </section>

        <section className="panel today-insights-panel">
          <div className="panel-heading">
            <div>
              <h2>Rule-Based Insights</h2>
              <p>Explainable MVP rules before AI forecasting is introduced.</p>
            </div>
          </div>
          <InsightList insights={dashboard.basicRuleBasedInsights} />
        </section>
      </div>
    </>
  );
}

function HealthScoreCard({ score }: { readonly score: number }) {
  return (
    <section className="health-card" aria-label="Business Health Score">
      <div>
        <p className="eyebrow">Business Health Score</p>
        <strong>{score}</strong>
        <span>/100</span>
      </div>
      <div className="health-ring" style={{ "--score": `${score}%` } as CSSProperties}>
        <HeartPulse size={30} aria-hidden="true" />
      </div>
      <p>{getHealthSummary(score)}</p>
    </section>
  );
}

function MetricTile({
  label,
  supporting,
  trend,
  value,
}: {
  readonly label: string;
  readonly supporting: string;
  readonly trend?: number | null;
  readonly value: string;
}) {
  const isPositiveTrend = typeof trend === "number" && trend >= 0;

  return (
    <div className="metric-tile today-metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small
        className={
          typeof trend === "number" ? (isPositiveTrend ? "positive" : "negative") : undefined
        }
      >
        {typeof trend === "number" ? (
          isPositiveTrend ? (
            <ArrowUpRight size={14} aria-hidden="true" />
          ) : (
            <ArrowDownRight size={14} aria-hidden="true" />
          )
        ) : null}
        {supporting}
      </small>
    </div>
  );
}

function PlatformBreakdown({
  metrics,
  valueFormatter,
}: {
  readonly metrics: readonly PlatformMetric[];
  readonly valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...metrics.map((metric) => metric.value), 0);

  if (metrics.length === 0) {
    return (
      <div className="empty-state compact-empty">
        <ShoppingBag size={18} aria-hidden="true" />
        <strong>No activity yet</strong>
        <span>Sync commerce data to see platform performance.</span>
      </div>
    );
  }

  return (
    <div className="platform-breakdown">
      {metrics.map((metric) => (
        <div className="platform-breakdown-row" key={metric.platform}>
          <div>
            <strong>{formatPlatform(metric.platform)}</strong>
            <span>{valueFormatter(metric.value)}</span>
          </div>
          <div className="platform-bar" aria-hidden="true">
            <span style={{ width: `${maxValue > 0 ? (metric.value / maxValue) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FocusItem({
  icon,
  label,
  supporting,
  value,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly supporting?: string;
  readonly value: string;
}) {
  return (
    <article className="focus-item">
      <div className="focus-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {supporting ? <small>{supporting}</small> : null}
      </div>
    </article>
  );
}

function InsightList({ insights }: { readonly insights: readonly RuleBasedInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="empty-state compact-empty">
        <CheckCircle2 size={18} aria-hidden="true" />
        <strong>No insight flags</strong>
        <span>There are no rule-based alerts for today.</span>
      </div>
    );
  }

  return (
    <div className="insight-list">
      {insights.map((insight) => (
        <article className={`insight-item ${insight.severity.toLowerCase()}`} key={insight.message}>
          {insight.severity === "WARNING" ? (
            <AlertTriangle size={18} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} aria-hidden="true" />
          )}
          <div>
            <strong>{formatInsightType(insight.type)}</strong>
            <span>{insight.message}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function TodayLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading Today dashboard">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Loading today’s multi-channel commerce view...</span>
    </section>
  );
}

function TodayErrorState({ message }: { readonly message: string }) {
  return (
    <section className="state-banner error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      {message}
    </section>
  );
}

function getFriendlyError(error: unknown): string {
  if (error instanceof DashboardClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load today's dashboard.";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "No baseline";
  }

  return `${value > 0 ? "+" : ""}${value}%`;
}

function formatPlatform(platform: StorePlatform): string {
  switch (platform) {
    case StorePlatform.AmazonSeller:
      return "Amazon Seller";
    case StorePlatform.TikTokShop:
      return "TikTok Shop";
    case StorePlatform.Shopify:
      return "Shopify";
    case StorePlatform.WooCommerce:
      return "WooCommerce";
  }
}

function formatPlatformList(platforms: readonly StorePlatform[]): string {
  if (platforms.length === 0) {
    return "No platforms connected";
  }

  return platforms.map(formatPlatform).join(", ");
}

function formatInsightType(type: RuleBasedInsight["type"]): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getHealthSummary(score: number): string {
  if (score >= 80) {
    return "Strong daily signal across revenue, stores, and inventory.";
  }

  if (score >= 60) {
    return "Stable, with a few areas worth checking today.";
  }

  return "Needs attention before the day gets away from you.";
}
