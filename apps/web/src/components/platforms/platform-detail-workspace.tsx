"use client";

import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Loader2,
  PackageSearch,
  RefreshCcw,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformsClientError,
  createPlatformsApiClient,
  type PlatformSummary,
} from "../../lib/api/platforms-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";
import { OrderStatusBadge } from "../orders/order-status-badge";

export function PlatformDetailWorkspace({ platform }: { readonly platform: StorePlatform }) {
  const platformsClient = useMemo(() => createPlatformsApiClient(), []);
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const platformName = formatPlatform(platform);

  const loadPlatform = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setSummary(null);
      setError("Sign in to view platform performance.");
      setLoading(false);
      return;
    }

    try {
      setSummary(await platformsClient.getPlatformSummary(session.accessToken, platform));
    } catch (caughtError) {
      setSummary(null);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [platform, platformsClient]);

  useEffect(() => {
    void loadPlatform();
  }, [loadPlatform]);

  return (
    <main className="workspace platform-detail-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Platform performance</p>
          <h1 className="platform-title">
            <PlatformIcon platform={platform} size="lg" />
            {platformName}
          </h1>
          <p>
            Store health, recent orders, product performance, and inventory attention for this
            channel only.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadPlatform()} type="button">
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {loading ? <PlatformLoadingState /> : null}
      {!loading && !error && summary ? <PlatformDetailContent summary={summary} /> : null}
    </main>
  );
}

function PlatformDetailContent({ summary }: { readonly summary: PlatformSummary }) {
  return (
    <>
      <section className="overview-grid" aria-label="Platform metrics">
        <MetricTile label="Revenue" value={formatCurrency(summary.metrics.revenue)} />
        <MetricTile label="Orders" value={summary.metrics.orders.toString()} />
        <MetricTile
          label="Average order value"
          value={formatCurrency(summary.metrics.averageOrderValue)}
        />
        <MetricTile label="Products sold" value={summary.metrics.productsSold.toString()} />
        <MetricTile label="Refunds" value={summary.metrics.refunds.toString()} />
        <MetricTile label="Low stock" value={summary.metrics.lowStockCount.toString()} />
      </section>

      <section className="platform-action-grid" aria-label="Platform drill-down actions">
        <ActionLink href={`/orders?platform=${summary.platform}`} icon={<ShoppingCart size={18} />}>
          View orders
        </ActionLink>
        <ActionLink
          href={`/products?platform=${summary.platform}`}
          icon={<PackageSearch size={18} />}
        >
          View products
        </ActionLink>
        <ActionLink href={`/customers?platform=${summary.platform}`} icon={<Users size={18} />}>
          View customers
        </ActionLink>
        <ActionLink href={`/inventory?platform=${summary.platform}`} icon={<Boxes size={18} />}>
          View inventory
        </ActionLink>
        <ActionLink href="/store-integrations" icon={<Store size={18} />}>
          View store connection
        </ActionLink>
      </section>

      <div className="today-content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Store health</h2>
              <p>Connection status and last synchronization for this platform.</p>
            </div>
          </div>
          <div className="platform-detail-list">
            {summary.connectedStores.map((store) => (
              <article className="platform-detail-row" key={store.id}>
                <div>
                  <strong>{store.storeName}</strong>
                  <span>{store.storeUrl ?? store.region ?? "Store connection"}</span>
                </div>
                <span className="order-status">{formatStatus(store.connectionStatus)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connection status</h2>
              <p>Sync resources tracked for this channel.</p>
            </div>
          </div>
          <div className="platform-detail-list">
            {summary.syncStatus.length > 0 ? (
              summary.syncStatus.map((cursor) => (
                <article className="platform-detail-row" key={cursor.resource}>
                  <div>
                    <strong>{formatResource(cursor.resource)}</strong>
                    <span>{formatDateTime(cursor.lastSuccessfulSyncedAt)}</span>
                  </div>
                  <span className="order-status">{formatStatus(cursor.status)}</span>
                </article>
              ))
            ) : (
              <EmptyPanelLine message="No sync cursor activity yet." />
            )}
          </div>
        </section>
      </div>

      <div className="today-content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent orders</h2>
              <p>Latest normalized orders for this platform.</p>
            </div>
          </div>
          <div className="platform-detail-list">
            {summary.recentOrders.length > 0 ? (
              summary.recentOrders.map((order) => (
                <article className="platform-detail-row" key={order.orderId}>
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <span>
                      {order.storeName} - {formatDate(order.orderDate)}
                    </span>
                  </div>
                  <div className="platform-detail-order-value">
                    <OrderStatusBadge status={order.status} />
                    <strong>
                      {formatCurrency(order.totalValue ?? 0, order.currency ?? "GBP")}
                    </strong>
                  </div>
                </article>
              ))
            ) : (
              <EmptyPanelLine message="No recent orders for this platform yet." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Top products</h2>
              <p>Products ranked by platform revenue.</p>
            </div>
          </div>
          <div className="platform-detail-list">
            {summary.topProducts.length > 0 ? (
              summary.topProducts.map((product, index) => (
                <article
                  className="platform-detail-row"
                  key={`${product.platformProductId ?? product.name}:${index}`}
                >
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.quantitySold} sold</span>
                  </div>
                  <strong>{formatCurrency(product.revenue)}</strong>
                </article>
              ))
            ) : (
              <EmptyPanelLine message="No product sales for this platform yet." />
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Inventory attention</h2>
            <p>Products on this platform that need stock review.</p>
          </div>
        </div>
        <div className="platform-detail-list">
          {summary.inventoryAlerts.length > 0 ? (
            summary.inventoryAlerts.map((alert) => (
              <article className="platform-detail-row" key={alert.productId}>
                <div>
                  <strong>{alert.productName ?? "Unnamed product"}</strong>
                  <span>{alert.sku ?? alert.storeName}</span>
                </div>
                <span className="order-status">{alert.currentStock ?? "No quantity"} on hand</span>
              </article>
            ))
          ) : (
            <EmptyPanelLine message="No inventory attention items for this platform." />
          )}
        </div>
      </section>
    </>
  );
}

function PlatformLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading platform performance">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Preparing platform performance...</span>
    </section>
  );
}

function MetricTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <CheckCircle2 size={14} aria-hidden="true" />
        Platform only
      </small>
    </div>
  );
}

function ActionLink({ children, href, icon }: ActionLinkProps) {
  return (
    <Link className="platform-action-link" href={href}>
      {icon}
      <span>{children}</span>
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

interface ActionLinkProps {
  readonly children: ReactNode;
  readonly href: string;
  readonly icon: ReactNode;
}

function EmptyPanelLine({ message }: { readonly message: string }) {
  return <div className="empty-state compact-empty">{message}</div>;
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof PlatformsClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load platform performance.";
}

function formatCurrency(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not yet synchronized";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function formatResource(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatStatus(value: string): string {
  return formatResource(value);
}
