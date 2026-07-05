"use client";

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClientError,
  StoreConnectionStatus,
  StorePlatform,
  WooCommerceApiVersion,
  createStoreIntegrationsApiClient,
  type ConnectedStore,
  type StoreSyncStatus,
  type SupportedStorePlatform,
} from "../../lib/api/store-integrations-client";
import { getDemoAccessToken, getFriendlyAuthErrorMessage } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";
import { DemoModeBanner } from "../demo/demo-mode-banner";

interface WooCommerceFormState {
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly storeName: string;
  readonly storeUrl: string;
}

interface AmazonSellerFormState {
  readonly accessToken: string;
  readonly marketplaceId: string;
  readonly refreshToken: string;
  readonly region: string;
  readonly sellerId: string;
  readonly storeName: string;
}

interface TikTokShopFormState {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly region: string;
  readonly shopCipher: string;
  readonly shopId: string;
  readonly storeName: string;
}

interface ShopifyFormState {
  readonly accessToken: string;
  readonly apiVersion: string;
  readonly shopDomain: string;
  readonly storeName: string;
  readonly storeUrl: string;
}

const emptyWooCommerceForm: WooCommerceFormState = {
  consumerKey: "",
  consumerSecret: "",
  storeName: "",
  storeUrl: "",
};

const emptyAmazonSellerForm: AmazonSellerFormState = {
  accessToken: "",
  marketplaceId: "",
  refreshToken: "",
  region: "GB",
  sellerId: "",
  storeName: "",
};

const emptyTikTokShopForm: TikTokShopFormState = {
  accessToken: "",
  refreshToken: "",
  region: "GB",
  shopCipher: "",
  shopId: "",
  storeName: "",
};

const emptyShopifyForm: ShopifyFormState = {
  accessToken: "",
  apiVersion: "2024-10",
  shopDomain: "",
  storeName: "",
  storeUrl: "",
};

export function StoreIntegrationsWorkspace() {
  const [platforms, setPlatforms] = useState<readonly SupportedStorePlatform[]>([]);
  const [stores, setStores] = useState<readonly ConnectedStore[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Readonly<Record<string, StoreSyncStatus>>>({});
  const [formState, setFormState] = useState<WooCommerceFormState>(emptyWooCommerceForm);
  const [amazonFormState, setAmazonFormState] =
    useState<AmazonSellerFormState>(emptyAmazonSellerForm);
  const [tikTokFormState, setTikTokFormState] = useState<TikTokShopFormState>(emptyTikTokShopForm);
  const [shopifyFormState, setShopifyFormState] = useState<ShopifyFormState>(emptyShopifyForm);
  const [loading, setLoading] = useState(true);
  const [actionStoreId, setActionStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apiClient = useMemo(
    () =>
      createStoreIntegrationsApiClient({
        accessTokenProvider: getDemoAccessToken,
      }),
    [],
  );

  const hasAccessToken = Boolean(getDemoAccessToken());

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const supportedPlatforms = await apiClient.listSupportedPlatforms();
      setPlatforms(supportedPlatforms);

      if (!getDemoAccessToken()) {
        setStores([]);
        setSyncStatuses({});
        return;
      }

      const connectedStores = await apiClient.listConnectedStores();
      setStores(connectedStores);

      const statuses = await Promise.all(
        connectedStores
          .filter((store) => isSyncEnabledPlatform(store.platform))
          .map(async (store) => [store.id, await apiClient.getStoreSyncStatus(store.id)] as const),
      );

      setSyncStatuses(Object.fromEntries(statuses));
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  async function runStoreAction(storeId: string, action: () => Promise<unknown>, message: string) {
    setActionStoreId(storeId);
    setError(null);
    setNotice(null);

    try {
      await action();
      setNotice(message);
      await loadWorkspace();
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setActionStoreId(null);
    }
  }

  async function handleWooCommerceConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionStoreId("connect-woocommerce");
    setError(null);
    setNotice(null);

    try {
      const connectedStore = await apiClient.connectWooCommerce({
        apiVersion: WooCommerceApiVersion.WcV3,
        consumerKey: formState.consumerKey,
        consumerSecret: formState.consumerSecret,
        storeName: formState.storeName,
        storeUrl: formState.storeUrl,
      });

      setNotice(`${connectedStore.storeName} was submitted for WooCommerce validation.`);
      setFormState(emptyWooCommerceForm);
      await loadWorkspace();
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setActionStoreId(null);
    }
  }

  async function handleAmazonSellerConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionStoreId("connect-amazon-seller");
    setError(null);
    setNotice(null);

    try {
      const connectedStore = await apiClient.connectAmazonSeller({
        accessToken: amazonFormState.accessToken,
        marketplaceId: amazonFormState.marketplaceId,
        refreshToken: amazonFormState.refreshToken,
        region: amazonFormState.region,
        sellerId: amazonFormState.sellerId,
        storeName: amazonFormState.storeName,
      });

      setNotice(`${connectedStore.storeName} was submitted for Amazon Seller validation.`);
      setAmazonFormState(emptyAmazonSellerForm);
      await loadWorkspace();
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setActionStoreId(null);
    }
  }

  async function handleTikTokShopConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionStoreId("connect-tiktok-shop");
    setError(null);
    setNotice(null);

    try {
      const connectedStore = await apiClient.connectTikTokShop({
        accessToken: tikTokFormState.accessToken,
        refreshToken: tikTokFormState.refreshToken,
        region: tikTokFormState.region,
        shopCipher: tikTokFormState.shopCipher,
        shopId: tikTokFormState.shopId,
        storeName: tikTokFormState.storeName,
      });

      setNotice(`${connectedStore.storeName} was submitted for TikTok Shop validation.`);
      setTikTokFormState(emptyTikTokShopForm);
      await loadWorkspace();
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setActionStoreId(null);
    }
  }

  async function handleShopifyConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionStoreId("connect-shopify");
    setError(null);
    setNotice(null);

    try {
      const connectedStore = await apiClient.connectShopify({
        accessToken: shopifyFormState.accessToken,
        apiVersion: shopifyFormState.apiVersion,
        shopDomain: shopifyFormState.shopDomain,
        storeName: shopifyFormState.storeName,
        storeUrl: shopifyFormState.storeUrl,
      });

      setNotice(`${connectedStore.storeName} was submitted for Shopify validation.`);
      setShopifyFormState(emptyShopifyForm);
      await loadWorkspace();
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setActionStoreId(null);
    }
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Store Integrations</p>
          <h1>Four connected channels, one read-only commerce layer.</h1>
          <p>
            Review WooCommerce, Amazon Seller, TikTok Shop, and Shopify connections while preserving
            marketplace data and credentials securely.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadWorkspace()}>
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <DemoModeBanner />

      {!hasAccessToken ? (
        <section className="state-banner warning" aria-live="polite">
          <ShieldCheck size={18} aria-hidden="true" />
          Sign in before managing protected store connections.
        </section>
      ) : null}

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {notice ? (
        <section className="state-banner success" aria-live="polite">
          <CheckCircle2 size={18} aria-hidden="true" />
          {notice}
        </section>
      ) : null}

      <section className="overview-grid" aria-label="Store integration summary">
        <MetricTile label="Supported platforms" value={platforms.length.toString()} />
        <MetricTile label="Connected stores" value={stores.length.toString()} />
        <MetricTile
          label="Sync-ready stores"
          value={stores.filter((store) => isSyncEnabledPlatform(store.platform)).length.toString()}
        />
        <MetricTile
          label="Needs attention"
          value={stores
            .filter((store) =>
              [StoreConnectionStatus.Error, StoreConnectionStatus.AuthenticationExpired].includes(
                store.connectionStatus,
              ),
            )
            .length.toString()}
        />
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Supported Platforms</h2>
              <p>
                WooCommerce, Amazon Seller, TikTok Shop, and Shopify are available side by side.
              </p>
            </div>
          </div>

          {loading ? <LoadingRows /> : null}
          {!loading && platforms.length === 0 ? (
            <EmptyState title="No platform list yet" body="Supported platforms will appear here." />
          ) : null}
          {!loading ? (
            <div className="platform-list">
              {platforms.map((platform) => (
                <PlatformRow key={platform.platform} platform={platform} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect WooCommerce</h2>
              <p>Connect a WooCommerce store for read-only validation and synchronization.</p>
            </div>
          </div>

          <form
            className="integration-form"
            onSubmit={(event) => void handleWooCommerceConnect(event)}
          >
            <label>
              Store name
              <input
                autoComplete="organization"
                name="storeName"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, storeName: event.target.value }))
                }
                placeholder="Sarah's Shop"
                required
                value={formState.storeName}
              />
            </label>
            <label>
              Store URL
              <input
                autoComplete="url"
                inputMode="url"
                name="storeUrl"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, storeUrl: event.target.value }))
                }
                placeholder="https://store.example.com"
                required
                type="url"
                value={formState.storeUrl}
              />
            </label>
            <label>
              Consumer key
              <input
                autoComplete="off"
                name="consumerKey"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, consumerKey: event.target.value }))
                }
                required
                type="password"
                value={formState.consumerKey}
              />
            </label>
            <label>
              Consumer secret
              <input
                autoComplete="off"
                name="consumerSecret"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, consumerSecret: event.target.value }))
                }
                required
                type="password"
                value={formState.consumerSecret}
              />
            </label>
            <button
              className="primary-button"
              disabled={!hasAccessToken || actionStoreId === "connect-woocommerce"}
              type="submit"
            >
              {actionStoreId === "connect-woocommerce" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <PlugZap size={16} aria-hidden="true" />
              )}
              Connect WooCommerce
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect Amazon Seller</h2>
              <p>
                Optional Amazon Seller setup for local testing; credentials are encrypted and used
                read-only.
              </p>
            </div>
          </div>

          <form
            className="integration-form"
            onSubmit={(event) => void handleAmazonSellerConnect(event)}
          >
            <label>
              Store name
              <input
                autoComplete="organization"
                name="amazonStoreName"
                onChange={(event) =>
                  setAmazonFormState((current) => ({
                    ...current,
                    storeName: event.target.value,
                  }))
                }
                placeholder="Amazon UK"
                required
                value={amazonFormState.storeName}
              />
            </label>
            <label>
              Region
              <input
                autoComplete="country"
                name="amazonRegion"
                onChange={(event) =>
                  setAmazonFormState((current) => ({ ...current, region: event.target.value }))
                }
                placeholder="GB"
                required
                value={amazonFormState.region}
              />
            </label>
            <label>
              Seller ID
              <input
                autoComplete="off"
                name="amazonSellerId"
                onChange={(event) =>
                  setAmazonFormState((current) => ({ ...current, sellerId: event.target.value }))
                }
                required
                value={amazonFormState.sellerId}
              />
            </label>
            <label>
              Marketplace ID
              <input
                autoComplete="off"
                name="amazonMarketplaceId"
                onChange={(event) =>
                  setAmazonFormState((current) => ({
                    ...current,
                    marketplaceId: event.target.value,
                  }))
                }
                placeholder="A1F83G8C2ARO7P"
                required
                value={amazonFormState.marketplaceId}
              />
            </label>
            <label>
              Access token
              <input
                autoComplete="off"
                name="amazonAccessToken"
                onChange={(event) =>
                  setAmazonFormState((current) => ({
                    ...current,
                    accessToken: event.target.value,
                  }))
                }
                required
                type="password"
                value={amazonFormState.accessToken}
              />
            </label>
            <label>
              Refresh token
              <input
                autoComplete="off"
                name="amazonRefreshToken"
                onChange={(event) =>
                  setAmazonFormState((current) => ({
                    ...current,
                    refreshToken: event.target.value,
                  }))
                }
                required
                type="password"
                value={amazonFormState.refreshToken}
              />
            </label>
            <button
              className="primary-button"
              disabled={!hasAccessToken || actionStoreId === "connect-amazon-seller"}
              type="submit"
            >
              {actionStoreId === "connect-amazon-seller" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <PlugZap size={16} aria-hidden="true" />
              )}
              Connect Amazon Seller
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect TikTok Shop</h2>
              <p>
                Optional TikTok Shop setup for local testing; credentials are encrypted and used
                read-only.
              </p>
            </div>
          </div>

          <form
            className="integration-form"
            onSubmit={(event) => void handleTikTokShopConnect(event)}
          >
            <label>
              Store name
              <input
                autoComplete="organization"
                name="tikTokStoreName"
                onChange={(event) =>
                  setTikTokFormState((current) => ({
                    ...current,
                    storeName: event.target.value,
                  }))
                }
                placeholder="TikTok UK"
                required
                value={tikTokFormState.storeName}
              />
            </label>
            <label>
              Region
              <input
                autoComplete="country"
                name="tikTokRegion"
                onChange={(event) =>
                  setTikTokFormState((current) => ({ ...current, region: event.target.value }))
                }
                placeholder="GB"
                required
                value={tikTokFormState.region}
              />
            </label>
            <label>
              Shop ID
              <input
                autoComplete="off"
                name="tikTokShopId"
                onChange={(event) =>
                  setTikTokFormState((current) => ({ ...current, shopId: event.target.value }))
                }
                required
                value={tikTokFormState.shopId}
              />
            </label>
            <label>
              Shop cipher
              <input
                autoComplete="off"
                name="tikTokShopCipher"
                onChange={(event) =>
                  setTikTokFormState((current) => ({
                    ...current,
                    shopCipher: event.target.value,
                  }))
                }
                required
                value={tikTokFormState.shopCipher}
              />
            </label>
            <label>
              Access token
              <input
                autoComplete="off"
                name="tikTokAccessToken"
                onChange={(event) =>
                  setTikTokFormState((current) => ({
                    ...current,
                    accessToken: event.target.value,
                  }))
                }
                required
                type="password"
                value={tikTokFormState.accessToken}
              />
            </label>
            <label>
              Refresh token
              <input
                autoComplete="off"
                name="tikTokRefreshToken"
                onChange={(event) =>
                  setTikTokFormState((current) => ({
                    ...current,
                    refreshToken: event.target.value,
                  }))
                }
                required
                type="password"
                value={tikTokFormState.refreshToken}
              />
            </label>
            <button
              className="primary-button"
              disabled={!hasAccessToken || actionStoreId === "connect-tiktok-shop"}
              type="submit"
            >
              {actionStoreId === "connect-tiktok-shop" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <PlugZap size={16} aria-hidden="true" />
              )}
              Connect TikTok Shop
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect Shopify</h2>
              <p>
                Optional Shopify setup for local testing; Admin API credentials are encrypted and
                used read-only.
              </p>
            </div>
          </div>

          <form className="integration-form" onSubmit={(event) => void handleShopifyConnect(event)}>
            <label>
              Store name
              <input
                autoComplete="organization"
                name="shopifyStoreName"
                onChange={(event) =>
                  setShopifyFormState((current) => ({
                    ...current,
                    storeName: event.target.value,
                  }))
                }
                placeholder="Shopify UK"
                required
                value={shopifyFormState.storeName}
              />
            </label>
            <label>
              Store URL
              <input
                autoComplete="url"
                inputMode="url"
                name="shopifyStoreUrl"
                onChange={(event) =>
                  setShopifyFormState((current) => ({
                    ...current,
                    storeUrl: event.target.value,
                  }))
                }
                placeholder="https://northstar.myshopify.com"
                required
                type="url"
                value={shopifyFormState.storeUrl}
              />
            </label>
            <label>
              Shop domain
              <input
                autoComplete="off"
                name="shopifyShopDomain"
                onChange={(event) =>
                  setShopifyFormState((current) => ({
                    ...current,
                    shopDomain: event.target.value,
                  }))
                }
                placeholder="northstar.myshopify.com"
                required
                value={shopifyFormState.shopDomain}
              />
            </label>
            <label>
              Admin API access token
              <input
                autoComplete="off"
                name="shopifyAccessToken"
                onChange={(event) =>
                  setShopifyFormState((current) => ({
                    ...current,
                    accessToken: event.target.value,
                  }))
                }
                required
                type="password"
                value={shopifyFormState.accessToken}
              />
            </label>
            <label>
              API version
              <input
                autoComplete="off"
                name="shopifyApiVersion"
                onChange={(event) =>
                  setShopifyFormState((current) => ({
                    ...current,
                    apiVersion: event.target.value,
                  }))
                }
                placeholder="2024-10"
                required
                value={shopifyFormState.apiVersion}
              />
            </label>
            <button
              className="primary-button"
              disabled={!hasAccessToken || actionStoreId === "connect-shopify"}
              type="submit"
            >
              {actionStoreId === "connect-shopify" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <PlugZap size={16} aria-hidden="true" />
              )}
              Connect Shopify
            </button>
          </form>
        </section>
      </div>

      <section className="panel stores-panel">
        <div className="panel-heading">
          <div>
            <h2>Connected Stores</h2>
            <p>Connection state, last sync, and safe channel summaries.</p>
          </div>
        </div>

        {loading ? <LoadingRows /> : null}
        {!loading && stores.length === 0 ? (
          <EmptyState
            title="No connected stores"
            body="Connect stores to start building a read-only commerce intelligence view."
          />
        ) : null}

        {!loading && stores.length > 0 ? (
          <div className="store-list">
            {stores.map((store) => (
              <StoreRow
                actionStoreId={actionStoreId}
                key={store.id}
                onDisconnect={() =>
                  void runStoreAction(
                    store.id,
                    () => apiClient.disconnectStore(store.id),
                    `${store.storeName} was disconnected.`,
                  )
                }
                onManualSync={() =>
                  void runStoreAction(
                    store.id,
                    () => apiClient.requestManualSync(store.id),
                    `Manual sync was queued for ${store.storeName}.`,
                  )
                }
                onRemoveSchedule={() =>
                  void runStoreAction(
                    store.id,
                    () => apiClient.removeSchedule(store.id),
                    `Scheduled sync was removed for ${store.storeName}.`,
                  )
                }
                onSchedule={() =>
                  void runStoreAction(
                    store.id,
                    () => apiClient.scheduleSync(store.id),
                    `Scheduled sync was created for ${store.storeName}.`,
                  )
                }
                store={store}
                syncStatus={syncStatuses[store.id]}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function StoreRow({
  actionStoreId,
  onDisconnect,
  onManualSync,
  onRemoveSchedule,
  onSchedule,
  store,
  syncStatus,
}: {
  readonly actionStoreId: string | null;
  readonly onDisconnect: () => void;
  readonly onManualSync: () => void;
  readonly onRemoveSchedule: () => void;
  readonly onSchedule: () => void;
  readonly store: ConnectedStore;
  readonly syncStatus: StoreSyncStatus | undefined;
}) {
  const isSyncEnabled = isSyncEnabledPlatform(store.platform);
  const isConnected = store.connectionStatus === StoreConnectionStatus.Connected;
  const isBusy = actionStoreId === store.id;

  return (
    <article className="store-row">
      <div className="store-main">
        <div className="store-title-row">
          <PlatformIcon platform={store.platform} />
          <h3>{store.storeName}</h3>
          <StatusBadge status={store.connectionStatus} />
        </div>
        <p>{getPlatformLabel(store.platform)}</p>
        <dl className="store-meta">
          <div>
            <dt>Store URL</dt>
            <dd>{store.storeUrl ?? "Not required"}</dd>
          </div>
          <div>
            <dt>Last synchronised</dt>
            <dd>{formatDateTime(store.lastSynchronisedAt)}</dd>
          </div>
        </dl>
      </div>

      {isSyncEnabled ? <SyncSummary syncStatus={syncStatus} /> : <PlaceholderSummary />}

      <div className="store-actions" aria-label={`Actions for ${store.storeName}`}>
        <button
          disabled={!isConnected || isBusy || !isSyncEnabled}
          onClick={onManualSync}
          type="button"
        >
          {isBusy ? (
            <Loader2 className="spin" size={16} aria-hidden="true" />
          ) : (
            <RefreshCcw size={16} aria-hidden="true" />
          )}
          Sync
        </button>
        <button
          disabled={!isConnected || isBusy || !isSyncEnabled}
          onClick={onSchedule}
          type="button"
        >
          <CalendarClock size={16} aria-hidden="true" />
          Schedule
        </button>
        <button disabled={isBusy || !isSyncEnabled} onClick={onRemoveSchedule} type="button">
          <Clock3 size={16} aria-hidden="true" />
          Remove schedule
        </button>
        <button
          disabled={!isConnected || isBusy || !isSyncEnabled}
          onClick={onDisconnect}
          type="button"
        >
          <Unlink size={16} aria-hidden="true" />
          Disconnect
        </button>
      </div>
    </article>
  );
}

function SyncSummary({ syncStatus }: { readonly syncStatus: StoreSyncStatus | undefined }) {
  if (!syncStatus) {
    return (
      <div className="sync-summary">
        <strong>Sync status</strong>
        <span>No cursor activity yet</span>
      </div>
    );
  }

  const failedCursors = syncStatus.cursors.filter((cursor) => cursor.status === "FAILED").length;
  const activeJobs = syncStatus.jobs.filter((job) =>
    ["ACTIVE", "QUEUED"].includes(job.status),
  ).length;

  return (
    <div className="sync-summary">
      <strong>{getPlatformLabel(syncStatus.platform)} sync</strong>
      <span>{syncStatus.cursors.length} resources tracked</span>
      <span>{activeJobs} queued or running jobs</span>
      <span>{failedCursors} resources need attention</span>
    </div>
  );
}

function PlaceholderSummary() {
  return (
    <div className="sync-summary muted">
      <strong>Read-only channel</strong>
      <span>Imported commerce data is available; sync can be queued from this workspace.</span>
    </div>
  );
}

function PlatformRow({ platform }: { readonly platform: SupportedStorePlatform }) {
  const isSyncEnabled = isSyncEnabledPlatform(platform.platform);

  return (
    <article className={`platform-row ${getPlatformClass(platform.platform)}`}>
      <div className="platform-icon">
        <PlatformIcon platform={platform.platform} />
      </div>
      <div>
        <h3>{platform.label}</h3>
        <p>
          {isSyncEnabled
            ? "Credential validation and read-only sync available."
            : "Read-only commerce data available."}
        </p>
      </div>
      <span className={isSyncEnabled ? "platform-state active" : "platform-state"}>
        {isSyncEnabled ? "Active" : "Available"}
      </span>
    </article>
  );
}

function MetricTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { readonly status: StoreConnectionStatus }) {
  return (
    <span className={`status-badge ${status.toLowerCase().replaceAll("_", "-")}`}>
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({ body, title }: { readonly body: string; readonly title: string }) {
  return (
    <div className="empty-state">
      <ShieldCheck size={18} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="loading-block" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}

function getFriendlyErrorMessage(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading store integrations.";
}

function isSyncEnabledPlatform(platform: StorePlatform): boolean {
  return (
    platform === StorePlatform.WooCommerce ||
    platform === StorePlatform.AmazonSeller ||
    platform === StorePlatform.TikTokShop ||
    platform === StorePlatform.Shopify
  );
}

function getPlatformLabel(platform: StorePlatform): string {
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

function formatStatus(status: StoreConnectionStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not yet synchronised";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
