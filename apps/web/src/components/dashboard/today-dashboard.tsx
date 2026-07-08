"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Loader2,
  PackageSearch,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardClientError,
  createDashboardApiClient,
  type PlatformMetric,
  type TodayDashboardResponse,
} from "../../lib/api/dashboard-client";
import {
  AiClientError,
  createAiApiClient,
  type AiBriefingTodayResponse,
  type DiagnosticObject,
  type IntelligenceEvidence,
  type ObservationObject,
  type RecommendationObject,
} from "../../lib/api/ai-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";

export function TodayDashboard() {
  const dashboardClient = useMemo(() => createDashboardApiClient(), []);
  const aiClient = useMemo(() => createAiApiClient(), []);
  const [aiBriefing, setAiBriefing] = useState<AiBriefingTodayResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<TodayDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setDashboard(null);
      setAiBriefing(null);
      setAiError(null);
      setError("Sign in to view today's commerce intelligence.");
      setLoading(false);
      return;
    }

    try {
      const [dashboardResponse, aiResponse] = await Promise.allSettled([
        dashboardClient.getTodayDashboard(session.accessToken),
        aiClient.getTodayBriefing(session.accessToken),
      ]);

      if (dashboardResponse.status === "fulfilled") {
        setDashboard(dashboardResponse.value);
      } else {
        setDashboard(null);
        setError(getFriendlyError(dashboardResponse.reason));
      }

      if (aiResponse.status === "fulfilled") {
        setAiBriefing(aiResponse.value);
        setAiError(null);
      } else {
        setAiBriefing(null);
        setAiError(getFriendlyAiError(aiResponse.reason));
      }
    } catch (caughtError) {
      setDashboard(null);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [aiClient, dashboardClient]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="workspace today-workspace">
      <header className="workspace-header today-header">
        <div>
          <h1>Today</h1>
          <p>
            {dashboard
              ? `Overview of ${dashboard.businessName} across connected commerce channels.`
              : "Overview of your business across connected commerce channels."}
          </p>
        </div>
        <div className="today-header-actions">
          <div className="date-chip" aria-label="Current dashboard date">
            <CalendarDays size={16} aria-hidden="true" />
            Today
          </div>
          <button className="icon-button" onClick={() => void loadDashboard()} type="button">
            <RefreshCcw size={18} aria-hidden="true" />
            <span className="sr-only">Refresh Today dashboard</span>
          </button>
        </div>
      </header>

      {loading ? <TodayLoadingState /> : null}
      {!loading && error ? <TodayErrorState message={error} /> : null}
      {!loading && !error && dashboard ? (
        <TodayDashboardContent aiBriefing={aiBriefing} aiError={aiError} dashboard={dashboard} />
      ) : null}
    </main>
  );
}

function TodayDashboardContent({
  aiBriefing,
  aiError,
  dashboard,
}: {
  readonly aiBriefing: AiBriefingTodayResponse | null;
  readonly aiError: string | null;
  readonly dashboard: TodayDashboardResponse;
}) {
  if (!dashboard.hasCommerceData) {
    return (
      <>
        <TodayOnboardingEmptyState dashboard={dashboard} />
        <AiBusinessBriefingSection briefing={aiBriefing} error={aiError} />
      </>
    );
  }

  return (
    <>
      <section className="today-top-grid" aria-label="Today headline metrics">
        <MetricTile
          icon={<TrendingUp size={22} />}
          label="Today revenue"
          value={formatCurrency(dashboard.todayRevenue)}
          supporting={`${formatTrend(dashboard.revenueChangePercent)} vs yesterday`}
          trend={dashboard.revenueChangePercent}
        />
        <MetricTile
          icon={<ShoppingCart size={22} />}
          label="Orders today"
          value={dashboard.ordersToday.toString()}
          supporting={`${dashboard.productsSoldToday} products sold`}
        />
        <MetricTile
          icon={<RotateCcw size={22} />}
          label="Refund count"
          value={dashboard.refundCountToday.toString()}
          supporting="Read-only order signal"
          inverse
        />
        <MetricTile
          href="/store-integrations"
          icon={<Store size={22} />}
          label="Connected platforms"
          value={dashboard.connectedPlatforms.length.toString()}
          supporting={formatPlatformList(dashboard.connectedPlatforms)}
        />
      </section>

      <div className="today-content-grid">
        <PlatformPanel
          description="Each channel stays separate so performance is clear without product matching."
          metrics={dashboard.revenueByPlatform}
          title="Revenue by Platform"
          valueFormatter={formatCurrency}
        />
        <PlatformPanel
          description="Today's source-channel order count for quick comparison."
          metrics={dashboard.ordersByPlatform}
          title="Orders by Platform"
          valueFormatter={(value) => value.toString()}
        />
      </div>

      <div className="today-content-grid today-lower-grid">
        <TodayBriefing dashboard={dashboard} />
        <HealthScoreCard dashboard={dashboard} />
      </div>

      <section className="panel today-focus-panel">
        <div className="panel-heading">
          <div>
            <h2>Key business health contributors</h2>
            <p>Deterministic signals from normalized commerce data.</p>
          </div>
        </div>
        <div className="focus-list health-contributor-list">
          <FocusItem
            href={
              dashboard.bestPlatformToday
                ? `/platforms/${dashboard.bestPlatformToday}?section=orders`
                : "/orders"
            }
            icon={<BarChart3 size={18} />}
            label="Strongest channel"
            value={
              dashboard.bestPlatformToday
                ? formatPlatform(dashboard.bestPlatformToday)
                : "No sales yet"
            }
          />
          <FocusItem
            href={
              dashboard.topProductToday
                ? `/products?search=${encodeURIComponent(dashboard.topProductToday.name)}`
                : "/products"
            }
            icon={<PackageSearch size={18} />}
            label="Top product"
            value={dashboard.topProductToday?.name ?? "No products sold yet"}
            supporting={
              dashboard.topProductToday
                ? `${dashboard.topProductToday.quantitySold} sold - ${formatCurrency(
                    dashboard.topProductToday.revenue,
                  )}`
                : undefined
            }
          />
          <FocusItem
            href="/inventory?stockStatus=LOW_STOCK"
            icon={<ShoppingBag size={18} />}
            label="Low stock products"
            value={dashboard.lowStockCount.toString()}
            supporting="Review inventory risk"
          />
        </div>
      </section>

      <AiBusinessBriefingSection briefing={aiBriefing} error={aiError} />
    </>
  );
}

export function AiBusinessBriefingSection({
  briefing,
  error,
}: {
  readonly briefing: AiBriefingTodayResponse | null;
  readonly error?: string | null;
}) {
  if (error) {
    return (
      <section className="panel ai-briefing-panel" aria-label="Salense Intelligence">
        <AiBriefingHeading confidence={null} />
        <div className="ai-briefing-empty warning">
          <AlertTriangle size={20} aria-hidden="true" />
          <strong>Salense Intelligence could not be loaded.</strong>
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (!briefing || briefing.status === "INSUFFICIENT_DATA") {
    return (
      <section className="panel ai-briefing-panel" aria-label="Salense Intelligence">
        <AiBriefingHeading confidence={briefing?.confidence ?? null} />
        <div className="ai-briefing-empty">
          <Brain size={22} aria-hidden="true" />
          <strong>
            Salense Intelligence will become available after your first successful store
            synchronization.
          </strong>
          <span>
            Connect a store and run a sync to unlock deterministic observations, risks,
            opportunities, and recommendations.
          </span>
        </div>
        {briefing?.explainability ? (
          <ExplainabilityDetails explainability={briefing.explainability} />
        ) : null}
      </section>
    );
  }

  return (
    <section className="panel ai-briefing-panel" aria-label="Salense Intelligence">
      <AiBriefingHeading confidence={briefing.confidence ?? null} />
      <div className="ai-briefing-hero">
        <div>
          <span>AI Business Briefing</span>
          <h2>{briefing.businessOverview?.businessName ?? "Commerce intelligence"}</h2>
          <p>{briefing.executiveSummary}</p>
        </div>
        <div className="ai-overview-grid">
          <AiOverviewMetric label="Revenue today" value={formatCurrency(briefing.businessOverview?.revenueToday ?? 0)} />
          <AiOverviewMetric label="Orders today" value={(briefing.businessOverview?.ordersToday ?? 0).toString()} />
          <AiOverviewMetric label="Platforms" value={(briefing.businessOverview?.connectedPlatforms.length ?? 0).toString()} />
          <AiOverviewMetric label="Health" value={briefing.businessHealth?.score === null || briefing.businessHealth?.score === undefined ? "Reviewing" : briefing.businessHealth.score.toString()} />
        </div>
      </div>

      <div className="ai-briefing-grid">
        <AiInsightColumn
          items={briefing.observations}
          title="Key observations"
          emptyText="No observations available yet."
        />
        <AiInsightColumn
          items={briefing.risks}
          title="Risks"
          emptyText="No material risks detected in synchronized data."
        />
        <AiInsightColumn
          items={briefing.opportunities}
          title="Opportunities"
          emptyText="No opportunities detected yet."
        />
      </div>

      <section className="ai-recommendations" aria-label="AI recommendations">
        <div className="panel-heading compact-heading">
          <div>
            <h3>Recommended next actions</h3>
            <p>Evidence-based actions from deterministic commerce reasoning.</p>
          </div>
        </div>
        <div className="ai-recommendation-list">
          {briefing.recommendations.length > 0 ? (
            briefing.recommendations.map((recommendation) => (
              <AiEvidenceCard
                confidence={briefing.confidence ?? null}
                item={recommendation}
                key={recommendation.id}
                label={recommendation.priority}
              />
            ))
          ) : (
            <div className="ai-briefing-empty compact-empty">
              <ShieldCheck size={18} aria-hidden="true" />
              <strong>No recommended action yet</strong>
              <span>Salense will add actions when synchronized data shows a clear risk or opportunity.</span>
            </div>
          )}
        </div>
      </section>

      {briefing.explainability ? (
        <ExplainabilityDetails explainability={briefing.explainability} />
      ) : null}
    </section>
  );
}

function AiBriefingHeading({
  confidence,
}: {
  readonly confidence: AiBriefingTodayResponse["confidence"] | null;
}) {
  return (
    <div className="panel-heading ai-briefing-heading">
      <div>
        <span className="eyebrow">Salense Intelligence</span>
        <h2>Business reasoning from synchronized commerce data.</h2>
        <p>Deterministic observations, risks, and recommendations with evidence attached.</p>
      </div>
      {confidence ? (
        <div className={`confidence-pill confidence-${confidence.level.toLowerCase()}`}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{confidence.level.toLowerCase()} confidence</span>
          <strong>{confidence.score}%</strong>
        </div>
      ) : null}
    </div>
  );
}

function AiOverviewMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AiInsightColumn<TItem extends ObservationObject | DiagnosticObject>({
  emptyText,
  items,
  title,
}: {
  readonly emptyText: string;
  readonly items: readonly TItem[];
  readonly title: string;
}) {
  return (
    <div className="ai-insight-column">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <div className="ai-insight-list">
          {items.map((item) => (
            <AiEvidenceCard item={item} key={item.id} label={item.severity} />
          ))}
        </div>
      ) : (
        <p className="ai-muted">{emptyText}</p>
      )}
    </div>
  );
}

function AiEvidenceCard({
  confidence,
  item,
  label,
}: {
  readonly confidence?: AiBriefingTodayResponse["confidence"] | null;
  readonly item: ObservationObject | DiagnosticObject | RecommendationObject;
  readonly label: string;
}) {
  return (
    <article className={`ai-evidence-card severity-${item.severity.toLowerCase()}`}>
      <div>
        <span>{label.toLowerCase()}</span>
        <h4>{item.title}</h4>
        <p>{item.summary}</p>
      </div>
      <details>
        <summary>
          <CircleHelp size={15} aria-hidden="true" />
          View evidence
        </summary>
        <div className="ai-evidence-details">
          <strong>Reasoning basis</strong>
          <p>{item.summary}</p>
          {confidence ? (
            <p>
              Confidence: {confidence.level.toLowerCase()} ({confidence.score}%)
            </p>
          ) : null}
          <EvidenceList evidence={item.evidence} />
        </div>
      </details>
    </article>
  );
}

function EvidenceList({ evidence }: { readonly evidence: readonly IntelligenceEvidence[] }) {
  if (evidence.length === 0) {
    return <p>No supporting metric was required for this signal.</p>;
  }

  return (
    <ul className="ai-evidence-list">
      {evidence.map((item) => (
        <li key={`${item.source}-${item.metric}-${item.value}`}>
          <span>{formatEvidenceSource(item.source)}</span>
          <strong>
            {item.metric}: {item.value}
          </strong>
        </li>
      ))}
    </ul>
  );
}

function ExplainabilityDetails({
  explainability,
}: {
  readonly explainability: NonNullable<AiBriefingTodayResponse["explainability"]>;
}) {
  return (
    <details className="ai-explainability">
      <summary>
        <CircleHelp size={16} aria-hidden="true" />
        Why this briefing?
      </summary>
      <div className="ai-explainability-grid">
        <ExplainabilityList items={explainability.dataSources} title="Data used" />
        <ExplainabilityList items={explainability.rulesApplied} title="Rules applied" />
        <ExplainabilityList items={explainability.limitations} title="Limitations" />
        <ExplainabilityList items={explainability.safetyConstraints} title="Safety constraints" />
      </div>
    </details>
  );
}

function ExplainabilityList({
  items,
  title,
}: {
  readonly items: readonly string[];
  readonly title: string;
}) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TodayOnboardingEmptyState({
  dashboard,
}: {
  readonly dashboard: TodayDashboardResponse;
}) {
  return (
    <section className="panel onboarding-empty-panel">
      <div className="empty-state">
        <Store size={28} aria-hidden="true" />
        <strong>No stores connected yet.</strong>
        <span>
          Connect your first commerce platform and run your first synchronization to activate
          Today for {dashboard.businessName}.
        </span>
        <Link className="primary-button" href="/store-integrations">
          Connect your first store
        </Link>
      </div>
      <div className="onboarding-empty-grid">
        <div>
          <span>Revenue</span>
          <strong>Available after synchronization</strong>
        </div>
        <div>
          <span>Orders</span>
          <strong>Available after synchronization</strong>
        </div>
        <div>
          <span>Business Health Score</span>
          <strong>
            Business Health Score will become available after your first successful
            synchronization.
          </strong>
        </div>
      </div>
    </section>
  );
}

function PlatformPanel({
  description,
  metrics,
  title,
  valueFormatter,
}: {
  readonly description: string;
  readonly metrics: readonly PlatformMetric[];
  readonly title: string;
  readonly valueFormatter: (value: number) => string;
}) {
  return (
    <section className="panel platform-performance-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <PlatformBreakdown metrics={metrics} valueFormatter={valueFormatter} />
      <Link className="panel-footer-link" href="/orders">
        View all platforms
      </Link>
    </section>
  );
}

function HealthScoreCard({ dashboard }: { readonly dashboard: TodayDashboardResponse }) {
  const score = dashboard.basicBusinessHealthScore;
  const contributors = getHealthContributors(dashboard);

  if (score === null) {
    return (
      <section className="panel health-score-panel" aria-label="Business Health Score">
        <div className="panel-heading">
          <div>
            <h2>Business Health Score</h2>
            <p>
              Business Health Score will become available after your first successful
              synchronization.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel health-score-panel" aria-label="Business Health Score">
      <div className="panel-heading">
        <div>
          <h2>Business Health Score</h2>
          <p>A real-time view of overall commerce health.</p>
        </div>
      </div>
      <div className="health-score-body">
        <div className="health-gauge" style={{ "--score": `${score}%` } as CSSProperties}>
          <strong>{score}</strong>
          <span>{getHealthLabel(score)}</span>
        </div>
        <div className="health-contributors">
          {contributors.map((contributor) => (
            <div key={contributor.label}>
              <span>{contributor.label}</span>
              <strong className={contributor.tone}>
                {contributor.tone === "risk" ? (
                  <AlertTriangle size={14} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={14} aria-hidden="true" />
                )}
                {contributor.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TodayBriefing({ dashboard }: { readonly dashboard: TodayDashboardResponse }) {
  const briefingItems = createBriefingItems(dashboard);

  return (
    <section className="panel today-briefing-panel" aria-label="Today Briefing">
      <div className="panel-heading">
        <div>
          <h2>Today Briefing</h2>
          <p>Key highlights from across the business.</p>
        </div>
      </div>
      <div className="briefing-list">
        {briefingItems.map((item) => (
          <Link className="briefing-item" href={item.href} key={item.title}>
            <span className={`briefing-item-icon ${item.tone}`}>{item.icon}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.body}</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function MetricTile({
  href,
  icon,
  inverse = false,
  label,
  supporting,
  trend,
  value,
}: {
  readonly href?: string;
  readonly icon: ReactNode;
  readonly inverse?: boolean;
  readonly label: string;
  readonly supporting: string;
  readonly trend?: number | null;
  readonly value: string;
}) {
  const content = (
    <>
      <span className={`metric-icon ${inverse ? "inverse" : ""}`}>{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={getTrendClass(trend, inverse)}>
        {typeof trend === "number" ? (
          trend >= 0 ? (
            <ArrowUpRight size={14} aria-hidden="true" />
          ) : (
            <ArrowDownRight size={14} aria-hidden="true" />
          )
        ) : null}
        {supporting}
      </small>
    </>
  );

  return href ? (
    <Link className="metric-tile today-metric-tile clickable-card" href={href}>
      {content}
    </Link>
  ) : (
    <div className="metric-tile today-metric-tile">{content}</div>
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
        <Link
          className={`platform-breakdown-row ${getPlatformClass(metric.platform)}`}
          href={`/platforms/${metric.platform}`}
          key={metric.platform}
        >
          <div>
            <strong>
              <PlatformIcon platform={metric.platform} />
              {formatPlatform(metric.platform)}
            </strong>
            <span>
              {valueFormatter(metric.value)}
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </div>
          <div className="platform-bar" aria-hidden="true">
            <span style={{ width: `${maxValue > 0 ? (metric.value / maxValue) * 100 : 0}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function FocusItem({
  href,
  icon,
  label,
  supporting,
  value,
}: {
  readonly href: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly supporting?: string | undefined;
  readonly value: string;
}) {
  return (
    <Link className="focus-item clickable-card" href={href}>
      <div className="focus-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {supporting ? <small>{supporting}</small> : null}
      </div>
      <ChevronRight size={16} aria-hidden="true" />
    </Link>
  );
}

function TodayLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading Today dashboard">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Preparing read-only commerce intelligence...</span>
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

function createBriefingItems(dashboard: TodayDashboardResponse): readonly {
  readonly body: string;
  readonly href: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly tone: "blue" | "green" | "orange" | "purple";
}[] {
  const platformCount = dashboard.connectedPlatforms.length;
  const strongestPlatform = dashboard.bestPlatformToday
    ? formatPlatform(dashboard.bestPlatformToday)
    : "No channel";

  return [
    {
      body: `${formatTrend(dashboard.revenueChangePercent)} vs yesterday across ${platformCount} platforms.`,
      href: dashboard.bestPlatformToday
        ? `/platforms/${dashboard.bestPlatformToday}?section=revenue`
        : "/orders",
      icon: <TrendingUp size={16} aria-hidden="true" />,
      title: `Revenue is ${formatCurrency(dashboard.todayRevenue)} today.`,
      tone: "green",
    },
    {
      body: `${dashboard.productsSoldToday} products sold across connected stores.`,
      href: "/orders",
      icon: <ShoppingCart size={16} aria-hidden="true" />,
      title: `${dashboard.ordersToday} orders received today.`,
      tone: "blue",
    },
    {
      body:
        dashboard.lowStockCount > 0
          ? "Review inventory to reduce stockout risk."
          : "Inventory risk is currently low.",
      href: "/inventory?stockStatus=LOW_STOCK",
      icon: <ShoppingBag size={16} aria-hidden="true" />,
      title: `${dashboard.lowStockCount} products are low in stock.`,
      tone: "orange",
    },
    {
      body: `${strongestPlatform} is currently the strongest channel.`,
      href: dashboard.bestPlatformToday
        ? `/platforms/${dashboard.bestPlatformToday}?section=orders`
        : "/orders",
      icon: <RotateCcw size={16} aria-hidden="true" />,
      title: `${dashboard.refundCountToday} refunds recorded today.`,
      tone: "purple",
    },
  ];
}

function getHealthContributors(dashboard: TodayDashboardResponse): readonly {
  readonly label: string;
  readonly tone: "good" | "risk";
  readonly value: string;
}[] {
  return [
    {
      label: "Sales",
      tone: dashboard.ordersToday > 0 ? "good" : "risk",
      value: dashboard.ordersToday > 0 ? "Good" : "At risk",
    },
    {
      label: "Channel coverage",
      tone: dashboard.connectedPlatforms.length >= 4 ? "good" : "risk",
      value: dashboard.connectedPlatforms.length >= 4 ? "Good" : "At risk",
    },
    {
      label: "Inventory",
      tone: dashboard.lowStockCount > 0 ? "risk" : "good",
      value: dashboard.lowStockCount > 0 ? "At risk" : "Good",
    },
    {
      label: "Refund activity",
      tone: dashboard.refundCountToday <= 2 ? "good" : "risk",
      value: dashboard.refundCountToday <= 2 ? "Good" : "At risk",
    },
  ];
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof DashboardClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load today's dashboard.";
}

function getFriendlyAiError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof AiClientError) {
    return error.message;
  }

  return "Salense Intelligence is temporarily unavailable.";
}

function formatEvidenceSource(source: IntelligenceEvidence["source"]): string {
  switch (source) {
    case "connected_stores":
      return "Connected stores";
    case "normalized_customers":
      return "Customers";
    case "normalized_inventory":
      return "Inventory";
    case "normalized_orders":
      return "Orders";
    case "normalized_products":
      return "Products";
    case "normalized_refunds":
      return "Refunds";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatTrend(value: number | null): string {
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

function getPlatformClass(platform: StorePlatform): string {
  switch (platform) {
    case StorePlatform.AmazonSeller:
      return "platform-amazon";
    case StorePlatform.TikTokShop:
      return "platform-tiktok";
    case StorePlatform.Shopify:
      return "platform-shopify";
    case StorePlatform.WooCommerce:
      return "platform-woocommerce";
  }
}

function formatPlatformList(platforms: readonly StorePlatform[]): string {
  if (platforms.length === 0) {
    return "No platforms connected";
  }

  return platforms.map(formatPlatform).join(", ");
}

function getTrendClass(trend: number | null | undefined, inverse: boolean): string | undefined {
  if (typeof trend !== "number") {
    return undefined;
  }

  const isPositive = trend >= 0;

  return isPositive !== inverse ? "positive" : "negative";
}

function getHealthLabel(score: number): string {
  if (score >= 80) {
    return "Good";
  }

  if (score >= 60) {
    return "Stable";
  }

  return "Needs attention";
}
