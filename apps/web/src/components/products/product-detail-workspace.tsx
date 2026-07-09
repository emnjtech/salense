"use client";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCcw,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ProductsClientError,
  createProductsApiClient,
  type CommerceProductDetail,
  type CommerceProductInsight,
  type CommerceProductRecentSale,
} from "../../lib/api/products-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";

interface ProductDetailWorkspaceProps {
  readonly productId: string;
}

export function ProductDetailWorkspace({ productId }: ProductDetailWorkspaceProps) {
  const productsClient = useMemo(() => createProductsApiClient(), []);
  const [product, setProduct] = useState<CommerceProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setProduct(null);
      setError("Sign in to view product details.");
      setLoading(false);
      return;
    }

    try {
      const response = await productsClient.getProduct(session.accessToken, productId);
      setProduct(response.product);
    } catch (caughtError) {
      setProduct(null);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [productId, productsClient]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  return (
    <main className="workspace product-detail-workspace">
      <header className="workspace-header">
        <div>
          <Link className="back-link" href="/products">
            <ArrowLeft size={16} aria-hidden="true" />
            Products
          </Link>
          <p className="eyebrow">Product Intelligence</p>
          <h1>{product?.productName ?? "Product details"}</h1>
          <p>
            Review source-level product performance, stock context, sales rate, and deterministic
            insights without merging marketplace identities.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadProduct()} type="button">
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {loading ? <ProductDetailLoadingState /> : null}

      {!loading && error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {!loading && product ? <ProductDetailContent product={product} /> : null}
    </main>
  );
}

function ProductDetailContent({ product }: { readonly product: CommerceProductDetail }) {
  return (
    <>
      <section className="panel product-detail-hero">
        <div>
          <span className="product-detail-platform">
            <PlatformIcon platform={product.platform} size="sm" />
            {formatPlatform(product.platform)}
          </span>
          <h2>{product.productName ?? "Unnamed product"}</h2>
          <p>
            {product.sku ? `SKU ${product.sku}` : `Platform ID ${product.platformProductId}`} from{" "}
            {product.store.storeName}. Salense keeps this product tied to its original store and
            platform.
          </p>
        </div>
        <div className="product-detail-source-card">
          <Store size={18} aria-hidden="true" />
          <span>Source store</span>
          <strong>{product.store.storeName}</strong>
          <small>{product.store.storeUrl ?? "Store URL not captured"}</small>
        </div>
      </section>

      <section className="overview-grid" aria-label="Product performance summary">
        <MetricTile
          icon={<TrendingUp size={18} aria-hidden="true" />}
          label="Sales rate"
          value={`${product.sales.salesRatePerDay}/day`}
          detail={`${product.sales.last30DaysUnitsSold} units in 30 days`}
        />
        <MetricTile
          icon={<BarChart3 size={18} aria-hidden="true" />}
          label="Revenue"
          value={formatCurrency(product.sales.totalRevenue, product.currency)}
          detail="Revenue-eligible orders only"
        />
        <MetricTile
          icon={<ShoppingBag size={18} aria-hidden="true" />}
          label="Units sold"
          value={product.sales.totalUnitsSold.toString()}
          detail={`${product.sales.totalOrders} orders`}
        />
        <MetricTile
          icon={<Package size={18} aria-hidden="true" />}
          label="Stock"
          value={product.currentStock === null ? "Unknown" : product.currentStock.toString()}
          detail={product.stockStatus ?? "Status not captured"}
        />
      </section>

      <section className="product-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Product details</h2>
            <p>Normalized product fields imported from the connected store.</p>
          </div>
          <dl className="settings-detail-list">
            <DetailItem label="Product name" value={product.productName ?? "Not captured"} />
            <DetailItem label="Platform product ID" value={product.platformProductId} />
            <DetailItem label="SKU" value={product.sku ?? "Not captured"} />
            <DetailItem label="Category" value={product.category ?? "Not captured"} />
            <DetailItem label="Type" value={product.productType ?? "Not captured"} />
            <DetailItem label="Status" value={product.productStatus ?? "Not captured"} />
            <DetailItem
              label="Current price"
              value={formatCurrency(product.price, product.currency)}
            />
            <DetailItem
              label="Regular price"
              value={formatCurrency(product.regularPrice, product.currency)}
            />
            <DetailItem
              label="Sale price"
              value={formatCurrency(product.salePrice, product.currency)}
            />
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Sales detail</h2>
            <p>Calculated from revenue-eligible normalized order line items.</p>
          </div>
          <dl className="settings-detail-list">
            <DetailItem
              label="Last 30 days revenue"
              value={formatCurrency(product.sales.last30DaysRevenue, product.currency)}
            />
            <DetailItem
              label="Average order value"
              value={formatCurrency(product.sales.averageOrderValue, product.currency)}
            />
            <DetailItem
              label="Last purchase"
              value={formatDateTime(product.sales.lastPurchaseDate)}
            />
            <DetailItem label="Imported" value={formatDateTime(product.importedAt)} />
            <DetailItem label="Last synced" value={formatDateTime(product.lastSyncedAt)} />
            <DetailItem label="Platform created" value={formatDateTime(product.platformCreatedAt)} />
            <DetailItem label="Platform updated" value={formatDateTime(product.platformUpdatedAt)} />
          </dl>
        </section>
      </section>

      <ProductInsights insights={product.insights} />
      <RecentSales sales={product.recentSales} currency={product.currency} />
    </>
  );
}

function ProductInsights({ insights }: { readonly insights: readonly CommerceProductInsight[] }) {
  return (
    <section className="panel today-insights-panel" aria-label="Product insights">
      <div className="panel-heading">
        <h2>Product insights</h2>
        <p>Deterministic guidance from normalized product, stock, and sales data.</p>
      </div>
      {insights.length > 0 ? (
        <div className="insight-list">
          {insights.map((insight) => (
            <article
              className={`insight-item ${insight.severity.toLowerCase()}`}
              key={insight.title}
            >
              {insight.severity === "WARNING" ? (
                <AlertCircle size={18} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              <div>
                <strong>{insight.title}</strong>
                <span>{insight.message}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state orders-empty-state">
          <Package size={20} aria-hidden="true" />
          <strong>No product insights yet</strong>
          <span>Insights will appear as more synchronized sales and stock data becomes available.</span>
        </div>
      )}
    </section>
  );
}

function RecentSales({
  currency,
  sales,
}: {
  readonly currency: string | null;
  readonly sales: readonly CommerceProductRecentSale[];
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Recent sales</h2>
        <p>Recent revenue-eligible line items for this source product.</p>
      </div>
      {sales.length > 0 ? (
        <div className="platform-detail-list">
          {sales.map((sale, index) => (
            <article
              className="platform-detail-row"
              key={`${sale.orderNumber ?? "order"}-${sale.date ?? "date"}-${sale.revenue}-${index}`}
            >
              <div>
                <strong>{sale.orderNumber ?? "Order number not captured"}</strong>
                <span>{formatDateTime(sale.date)}</span>
              </div>
              <span className="order-status">{sale.status ?? "Status not captured"}</span>
              <div className="platform-detail-order-value">
                <strong>{formatCurrency(sale.revenue, currency)}</strong>
                <span>{sale.quantity} units</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state orders-empty-state">
          <CalendarClock size={20} aria-hidden="true" />
          <strong>No revenue-eligible sales yet</strong>
          <span>This product has no completed, processing, shipped, delivered, or paid sales.</span>
        </div>
      )}
    </section>
  );
}

function MetricTile({
  detail,
  icon,
  label,
  value,
}: {
  readonly detail: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="metric-tile product-detail-metric">
      <span className="metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function DetailItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ProductDetailLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading product details">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Loading source-level product detail...</span>
    </section>
  );
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof ProductsClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load product details.";
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null) {
    return "Not captured";
  }

  return new Intl.NumberFormat("en-GB", {
    currency: currency ?? "GBP",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not captured";
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
