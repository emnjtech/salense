"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
} from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ProductsClientError,
  createProductsApiClient,
  type CommerceProductFilters,
  type CommerceProductListItem,
} from "../../lib/api/products-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { readDemoSession } from "../../lib/auth-session";
import { DemoModeBanner } from "../demo/demo-mode-banner";

const allPlatforms = "ALL";

interface ProductsFilterState {
  readonly platform: StorePlatform | typeof allPlatforms;
  readonly search: string;
  readonly stockStatus: string;
}

const emptyFilters: ProductsFilterState = {
  platform: allPlatforms,
  search: "",
  stockStatus: "",
};

export function ProductsWorkspace() {
  const productsClient = useMemo(() => createProductsApiClient(), []);
  const [products, setProducts] = useState<readonly CommerceProductListItem[]>([]);
  const [filters, setFilters] = useState<ProductsFilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setProducts([]);
      setError("Sign in as demo@salense.local to view the seeded unified products.");
      setLoading(false);
      return;
    }

    try {
      const response = await productsClient.listProducts(session.accessToken, apiFilters);
      setProducts(response.products);
    } catch (caughtError) {
      setProducts([]);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [apiFilters, productsClient]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const totalRevenue = products.reduce((total, product) => total + product.revenue, 0);
  const unitsSold = products.reduce((total, product) => total + product.unitsSold, 0);
  const lowStockCount = products.filter(isLowStock).length;
  const uniquePlatforms = new Set(products.map((product) => product.platform)).size;

  function updateFilter<Key extends keyof ProductsFilterState>(
    key: Key,
    value: ProductsFilterState[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace orders-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Unified Products</p>
          <h1>See product performance across every connected channel.</h1>
          <p>
            Review seeded platform-scoped products, stock state, units sold, and revenue while
            keeping marketplace records authoritative and read-only.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadProducts()} type="button">
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

      <section className="overview-grid" aria-label="Products summary">
        <MetricTile label="Products" value={products.length.toString()} />
        <MetricTile label="Units sold" value={unitsSold.toString()} />
        <MetricTile
          label="Revenue"
          value={formatCurrency(totalRevenue, getPrimaryCurrency(products))}
        />
        <MetricTile label="Low stock" value={lowStockCount.toString()} />
        <MetricTile label="Platforms" value={uniquePlatforms.toString()} />
      </section>

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
              updateFilter("platform", event.target.value as StorePlatform | typeof allPlatforms)
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
        </div>

        {loading ? <ProductsLoadingState /> : null}
        {!loading && !error && products.length === 0 ? <ProductsEmptyState /> : null}
        {!loading && products.length > 0 ? <ProductsTable products={products} /> : null}
      </section>
    </main>
  );
}

function ProductsTable({ products }: { readonly products: readonly CommerceProductListItem[] }) {
  return (
    <div className="orders-table-wrap">
      <table className="orders-table products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Platform</th>
            <th>Store</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Sold</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.productId}>
              <td>
                <strong>{product.productName ?? "Unnamed product"}</strong>
                <span>{product.sku ?? product.platformProductId}</span>
              </td>
              <td>{formatPlatform(product.platform)}</td>
              <td>{product.storeName}</td>
              <td>{product.category ?? "Not captured"}</td>
              <td>{formatCurrency(product.price, product.currency)}</td>
              <td>
                <span className="order-status">{product.stockStatus ?? "Unknown"}</span>
                <span>
                  {product.currentStock === null
                    ? "No quantity"
                    : `${product.currentStock} on hand`}
                </span>
              </td>
              <td>{product.unitsSold}</td>
              <td>{formatCurrency(product.revenue, product.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading products">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Loading seeded product performance across all supported platforms...</span>
    </section>
  );
}

function ProductsEmptyState() {
  return (
    <div className="empty-state orders-empty-state">
      <PackageSearch size={22} aria-hidden="true" />
      <strong>No products match this view</strong>
      <span>
        Clear filters, run the demo seed, or sync stores to see normalized product performance.
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

function toApiFilters(filters: ProductsFilterState): CommerceProductFilters {
  return {
    ...(filters.platform !== allPlatforms ? { platform: filters.platform } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.stockStatus.trim() ? { stockStatus: filters.stockStatus.trim() } : {}),
  };
}

function getFriendlyError(error: unknown): string {
  if (error instanceof ProductsClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load unified products.";
}

function isLowStock(product: CommerceProductListItem): boolean {
  const normalizedStatus = product.stockStatus?.toLowerCase() ?? "";

  return (
    normalizedStatus.includes("low") ||
    normalizedStatus.includes("out") ||
    (product.currentStock ?? 999) <= 5
  );
}

function getPrimaryCurrency(products: readonly CommerceProductListItem[]): string | null {
  return products.find((product) => product.currency)?.currency ?? "GBP";
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null) {
    return "Not captured";
  }

  return new Intl.NumberFormat("en-GB", {
    currency: currency ?? "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
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
