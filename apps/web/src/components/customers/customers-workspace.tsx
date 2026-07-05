"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCcw, Search, Users } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CustomersClientError,
  createCustomersApiClient,
  type CommerceCustomerFilters,
  type CommerceCustomerListItem,
  type CommerceCustomersSummary,
} from "../../lib/api/customers-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { DemoModeBanner } from "../demo/demo-mode-banner";

const allPlatforms = "ALL";

interface CustomersFilterState {
  readonly country: string;
  readonly platform: StorePlatform | typeof allPlatforms;
  readonly search: string;
}

const emptyFilters: CustomersFilterState = {
  country: "",
  platform: allPlatforms,
  search: "",
};

const emptySummary: CommerceCustomersSummary = {
  highestLifetimeCustomer: null,
  newCustomers: 0,
  returningCustomers: 0,
};

export function CustomersWorkspace() {
  const customersClient = useMemo(() => createCustomersApiClient(), []);
  const [customers, setCustomers] = useState<readonly CommerceCustomerListItem[]>([]);
  const [summary, setSummary] = useState<CommerceCustomersSummary>(emptySummary);
  const [filters, setFilters] = useState<CustomersFilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setCustomers([]);
      setSummary(emptySummary);
      setError("Sign in to view customer intelligence.");
      setLoading(false);
      return;
    }

    try {
      const response = await customersClient.listCustomers(session.accessToken, apiFilters);
      setCustomers(response.customers);
      setSummary(response.summary);
    } catch (caughtError) {
      setCustomers([]);
      setSummary(emptySummary);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [apiFilters, customersClient]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function updateFilter<Key extends keyof CustomersFilterState>(
    key: Key,
    value: CustomersFilterState[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace orders-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Customer Intelligence</p>
          <h1>Understand customer value across every connected channel.</h1>
          <p>
            Review normalized WooCommerce, Amazon Seller, TikTok Shop, and Shopify customers with
            deterministic purchase metrics and platform identity preserved.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadCustomers()} type="button">
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
          <section className="overview-grid" aria-label="Customer intelligence summary">
            <MetricTile label="New customers" value={summary.newCustomers.toString()} />
            <MetricTile label="Returning customers" value={summary.returningCustomers.toString()} />
            <MetricTile
              label="Highest lifetime customer"
              value={summary.highestLifetimeCustomer?.customerName ?? "No purchases yet"}
              supporting={
                summary.highestLifetimeCustomer
                  ? formatCurrency(summary.highestLifetimeCustomer.lifetimeSpend)
                  : "Sync customer orders"
              }
            />
          </section>

          <section className="panel orders-panel">
            <div className="products-toolbar">
              <label className="orders-search">
                <Search size={16} aria-hidden="true" />
                <input
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Search customer, email, city"
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
                aria-label="Country"
                onChange={(event) => updateFilter("country", event.target.value)}
                placeholder="Country"
                value={filters.country}
              />
            </div>

            {loading ? <CustomersLoadingState /> : null}
            {!loading && !error && customers.length === 0 ? <CustomersEmptyState /> : null}
            {!loading && customers.length > 0 ? <CustomersTable customers={customers} /> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

function CustomersTable({
  customers,
}: {
  readonly customers: readonly CommerceCustomerListItem[];
}) {
  return (
    <div className="orders-table-wrap">
      <table className="orders-table products-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Platform</th>
            <th>Country</th>
            <th>Orders</th>
            <th>Lifetime Spend</th>
            <th>Average Order Value</th>
            <th>Last Purchase</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.customerId}>
              <td>
                <strong>{customer.customerName ?? "Unnamed customer"}</strong>
                <span>{customer.customerEmail ?? "No email captured"}</span>
              </td>
              <td>{formatPlatform(customer.platform)}</td>
              <td>
                <strong>{customer.country ?? "Not captured"}</strong>
                <span>{customer.city ?? "No city captured"}</span>
              </td>
              <td>{customer.totalOrders}</td>
              <td>{formatCurrency(customer.lifetimeSpend)}</td>
              <td>{formatCurrency(customer.averageOrderValue)}</td>
              <td>{formatDate(customer.lastPurchaseDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading customers">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Preparing deterministic customer value across connected platforms...</span>
    </section>
  );
}

function CustomersEmptyState() {
  return (
    <div className="empty-state orders-empty-state">
      <Users size={22} aria-hidden="true" />
      <strong>No customers match this view</strong>
      <span>
        Clear filters to return to the full customer view, or sync stores to refresh data.
      </span>
    </div>
  );
}

function MetricTile({
  label,
  supporting = "Deterministic",
  value,
}: {
  readonly label: string;
  readonly supporting?: string;
  readonly value: string;
}) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <CheckCircle2 size={14} aria-hidden="true" />
        {supporting}
      </small>
    </div>
  );
}

function toApiFilters(filters: CustomersFilterState): CommerceCustomerFilters {
  return {
    ...(filters.platform !== allPlatforms ? { platform: filters.platform } : {}),
    ...(filters.country.trim() ? { country: filters.country.trim() } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  };
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof CustomersClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load customer intelligence.";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No purchases yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
