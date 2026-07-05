"use client";

import { AlertCircle, Boxes, CheckCircle2, Loader2, RefreshCcw, Search } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  InventoryClientError,
  createInventoryApiClient,
  type CommerceInventoryFilters,
  type CommerceInventoryInsight,
  type CommerceInventoryListItem,
  type CommerceInventorySummary,
} from "../../lib/api/inventory-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";
import { DemoModeBanner } from "../demo/demo-mode-banner";

const allPlatforms = "ALL";

interface InventoryFilterState {
  readonly category: string;
  readonly platform: StorePlatform | typeof allPlatforms;
  readonly search: string;
  readonly stockStatus: string;
}

const emptyFilters: InventoryFilterState = {
  category: "",
  platform: allPlatforms,
  search: "",
  stockStatus: "",
};

const emptySummary: CommerceInventorySummary = {
  inventoryValue: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
};

export function InventoryWorkspace() {
  const inventoryClient = useMemo(() => createInventoryApiClient(), []);
  const [inventory, setInventory] = useState<readonly CommerceInventoryListItem[]>([]);
  const [insights, setInsights] = useState<readonly CommerceInventoryInsight[]>([]);
  const [summary, setSummary] = useState<CommerceInventorySummary>(emptySummary);
  const [filters, setFilters] = useState<InventoryFilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setInventory([]);
      setInsights([]);
      setSummary(emptySummary);
      setError("Sign in to view inventory intelligence.");
      setLoading(false);
      return;
    }

    try {
      const response = await inventoryClient.listInventory(session.accessToken, apiFilters);
      setInventory(response.inventory);
      setInsights(response.insights);
      setSummary(response.summary);
    } catch (caughtError) {
      setInventory([]);
      setInsights([]);
      setSummary(emptySummary);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [apiFilters, inventoryClient]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");
    const stockStatus = params.get("stockStatus");

    setFilters((current) => ({
      ...current,
      ...(isStorePlatform(platform) ? { platform } : {}),
      ...(stockStatus ? { stockStatus } : {}),
    }));
  }, []);

  function updateFilter<Key extends keyof InventoryFilterState>(
    key: Key,
    value: InventoryFilterState[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace orders-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Inventory Intelligence</p>
          <h1>Track stock risk and inventory value across every channel.</h1>
          <p>
            Monitor platform-scoped product stock, estimated days remaining, and deterministic
            inventory rules without changing marketplace records.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadInventory()} type="button">
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <DemoModeBanner />

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {!error ? (
        <>
          <section className="overview-grid" aria-label="Inventory intelligence summary">
            <MetricTile label="Low stock products" value={summary.lowStockProducts.toString()} />
            <MetricTile
              label="Out of stock products"
              value={summary.outOfStockProducts.toString()}
            />
            <MetricTile label="Inventory value" value={formatCurrency(summary.inventoryValue)} />
          </section>

          {insights.length > 0 ? <InventoryInsights insights={insights} /> : null}

          <section className="panel orders-panel">
            <div className="products-toolbar">
              <label className="orders-search">
                <Search size={16} aria-hidden="true" />
                <input
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Search product, SKU, platform ID"
                  type="search"
                  value={filters.search}
                />
              </label>
              <select
                aria-label="Platform"
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateFilter(
                    "platform",
                    event.target.value as StorePlatform | typeof allPlatforms,
                  )
                }
                value={filters.platform}
              >
                <option value={allPlatforms}>All platforms</option>
                <option value={StorePlatform.WooCommerce}>WooCommerce</option>
                <option value={StorePlatform.AmazonSeller}>Amazon Seller</option>
                <option value={StorePlatform.TikTokShop}>TikTok Shop</option>
                <option value={StorePlatform.Shopify}>Shopify</option>
              </select>
              <input
                aria-label="Stock status"
                onChange={(event) => updateFilter("stockStatus", event.target.value)}
                placeholder="Stock status"
                value={filters.stockStatus}
              />
              <input
                aria-label="Category"
                onChange={(event) => updateFilter("category", event.target.value)}
                placeholder="Category"
                value={filters.category}
              />
            </div>

            {loading ? <InventoryLoadingState /> : null}
            {!loading && !error && inventory.length === 0 ? <InventoryEmptyState /> : null}
            {!loading && inventory.length > 0 ? <InventoryTable inventory={inventory} /> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

function InventoryTable({
  inventory,
}: {
  readonly inventory: readonly CommerceInventoryListItem[];
}) {
  return (
    <div className="orders-table-wrap">
      <table className="orders-table products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Platform</th>
            <th>Store</th>
            <th>SKU</th>
            <th>Current Stock</th>
            <th>Days Remaining</th>
            <th>Inventory Value</th>
            <th>Stock Status</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item) => (
            <tr key={item.inventoryId}>
              <td>
                <strong>{item.productName ?? "Unnamed product"}</strong>
                <span>{item.category ?? "No category"}</span>
              </td>
              <td>
                <span className="platform-cell">
                  <PlatformIcon platform={item.platform} size="sm" />
                  {formatPlatform(item.platform)}
                </span>
              </td>
              <td>{item.storeName}</td>
              <td>{item.sku ?? "Not captured"}</td>
              <td>
                <strong>{item.currentStock ?? "No quantity"}</strong>
                <span>Reorder at {item.reorderLevel}</span>
              </td>
              <td>{formatDaysRemaining(item.estimatedDaysRemaining)}</td>
              <td>{formatCurrency(item.inventoryValue)}</td>
              <td>
                <span className="order-status">{item.stockStatus ?? "Unknown"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryInsights({
  insights,
}: {
  readonly insights: readonly CommerceInventoryInsight[];
}) {
  return (
    <section className="panel today-insights-panel" aria-label="Inventory insights">
      <div className="panel-heading">
        <div>
          <h2>Inventory Insights</h2>
          <p>Deterministic stock rules from normalized commerce data.</p>
        </div>
      </div>
      <div className="insight-list">
        {insights.map((insight) => (
          <article
            className={`insight-item ${insight.severity.toLowerCase()}`}
            key={insight.message}
          >
            {insight.severity === "WARNING" ? (
              <AlertCircle size={18} aria-hidden="true" />
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
    </section>
  );
}

function InventoryLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading inventory">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Preparing stock risk and inventory value across connected platforms...</span>
    </section>
  );
}

function InventoryEmptyState() {
  return (
    <div className="empty-state orders-empty-state">
      <Boxes size={22} aria-hidden="true" />
      <strong>No inventory matches this view</strong>
      <span>
        Clear filters to return to the full stock picture, or sync stores to refresh inventory.
      </span>
    </div>
  );
}

function MetricTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <CheckCircle2 size={14} aria-hidden="true" />
        Read-only
      </small>
    </div>
  );
}

function toApiFilters(filters: InventoryFilterState): CommerceInventoryFilters {
  return {
    ...(filters.platform !== allPlatforms ? { platform: filters.platform } : {}),
    ...(filters.stockStatus.trim() ? { stockStatus: filters.stockStatus.trim() } : {}),
    ...(filters.category.trim() ? { category: filters.category.trim() } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  };
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof InventoryClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load inventory intelligence.";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDaysRemaining(value: number | null): string {
  if (value === null) {
    return "No sales baseline";
  }

  return `${Math.ceil(value)} day${Math.ceil(value) === 1 ? "" : "s"}`;
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

function formatInsightType(type: CommerceInventoryInsight["type"]): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function isStorePlatform(value: string | null): value is StorePlatform {
  return Object.values(StorePlatform).includes(value as StorePlatform);
}
