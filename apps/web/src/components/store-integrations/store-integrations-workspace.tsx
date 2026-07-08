"use client";

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
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
  type StoreSyncJobStatus,
  type StoreSyncStatus,
  type SupportedStorePlatform,
} from "../../lib/api/store-integrations-client";
import { getDemoAccessToken, getFriendlyAuthErrorMessage } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";
import { WorkspaceContextBanner } from "../workspace/workspace-context-banner";

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

const emptyAuthorizationInput = {
  region: "GB",
  shop: "",
  storeName: "",
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
  const [authorizationInput, setAuthorizationInput] = useState(emptyAuthorizationInput);
  const [loading, setLoading] = useState(true);
  const [actionStoreId, setActionStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);

  const apiClient = useMemo(
    () =>
      createStoreIntegrationsApiClient({
        accessTokenProvider: getDemoAccessToken,
      }),
    [],
  );
  const platformConnectionState = useMemo(() => toPlatformConnectionState(stores), [stores]);
  const wooCommerceConnection = platformConnectionState[StorePlatform.WooCommerce] ?? null;
  const amazonSellerConnection = platformConnectionState[StorePlatform.AmazonSeller] ?? null;
  const tikTokShopConnection = platformConnectionState[StorePlatform.TikTokShop] ?? null;
  const shopifyConnection = platformConnectionState[StorePlatform.Shopify] ?? null;

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const supportedPlatforms = await apiClient.listSupportedPlatforms();
      setPlatforms(supportedPlatforms);

      const accessToken = getDemoAccessToken();
      setHasAccessToken(Boolean(accessToken));
      setSessionChecked(true);

      if (!accessToken) {
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
      setSessionChecked(true);
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

    if (!canInitiateStoreConnection(wooCommerceConnection)) {
      setNotice(getDuplicateConnectionNotice("WooCommerce"));
      return;
    }

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

      setNotice(getConnectionNotice(connectedStore, "WooCommerce"));
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

    if (!canInitiateStoreConnection(amazonSellerConnection)) {
      setNotice(getDuplicateConnectionNotice("Amazon Seller"));
      return;
    }

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

      setNotice(getConnectionNotice(connectedStore, "Amazon Seller"));
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

    if (!canInitiateStoreConnection(tikTokShopConnection)) {
      setNotice(getDuplicateConnectionNotice("TikTok Shop"));
      return;
    }

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

      setNotice(getConnectionNotice(connectedStore, "TikTok Shop"));
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

    if (!canInitiateStoreConnection(shopifyConnection)) {
      setNotice(getDuplicateConnectionNotice("Shopify"));
      return;
    }

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

      setNotice(getConnectionNotice(connectedStore, "Shopify"));
      setShopifyFormState(emptyShopifyForm);
      await loadWorkspace();
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      setActionStoreId(null);
    }
  }

  async function startShopifyAuthorization() {
    if (!canInitiateStoreConnection(shopifyConnection)) {
      setNotice(getDuplicateConnectionNotice("Shopify"));
      return;
    }

    setActionStoreId("oauth-shopify");
    setError(null);
    setNotice(null);

    try {
      const response = await apiClient.startShopifyOAuth({
        shop: authorizationInput.shop,
        storeName: authorizationInput.storeName,
      });
      window.location.assign(response.authorizationUrl);
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
      setActionStoreId(null);
    }
  }

  async function startAmazonSellerAuthorization() {
    if (!canInitiateStoreConnection(amazonSellerConnection)) {
      setNotice(getDuplicateConnectionNotice("Amazon Seller"));
      return;
    }

    setActionStoreId("oauth-amazon-seller");
    setError(null);
    setNotice(null);

    try {
      const response = await apiClient.startAmazonSellerOAuth({
        region: authorizationInput.region,
        storeName: authorizationInput.storeName,
      });
      window.location.assign(response.authorizationUrl);
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
      setActionStoreId(null);
    }
  }

  async function startTikTokShopAuthorization() {
    if (!canInitiateStoreConnection(tikTokShopConnection)) {
      setNotice(getDuplicateConnectionNotice("TikTok Shop"));
      return;
    }

    setActionStoreId("oauth-tiktok-shop");
    setError(null);
    setNotice(null);

    try {
      const response = await apiClient.startTikTokShopOAuth({
        region: authorizationInput.region,
        storeName: authorizationInput.storeName,
      });
      window.location.assign(response.authorizationUrl);
    } catch (caughtError) {
      setError(getFriendlyErrorMessage(caughtError));
      setActionStoreId(null);
    }
  }

  function showWooCommerceGuidedSetup() {
    setNotice(
      "WooCommerce uses read-only REST API keys. Open Advanced manual setup for guided steps and encrypted key storage.",
    );
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

      <WorkspaceContextBanner />

      {sessionChecked && !hasAccessToken ? (
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
              <p>
                Approve read-only access with WooCommerce REST API keys. Salense will never modify
                your store.
              </p>
            </div>
          </div>

          <div className="authorization-card-actions">
            <button
              className={getConnectionButtonClassName(wooCommerceConnection)}
              disabled={
                !hasAccessToken ||
                actionStoreId === "connect-woocommerce" ||
                !canInitiateStoreConnection(wooCommerceConnection)
              }
              onClick={showWooCommerceGuidedSetup}
              type="button"
            >
              <PlugZap size={16} aria-hidden="true" />
              {getConnectionButtonLabel("WooCommerce", wooCommerceConnection)}
            </button>
            <span>Generate read-only REST API keys in WooCommerce, then store them securely.</span>
          </div>

          <details className="advanced-manual-setup">
            <summary>Advanced manual setup</summary>
            <ol className="guided-setup-list">
              <li>Open WooCommerce, then go to Settings, Advanced, REST API.</li>
              <li>Create a key with read-only permissions.</li>
              <li>Copy the consumer key and consumer secret into Salense.</li>
            </ol>
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
                className={getConnectionButtonClassName(wooCommerceConnection)}
                disabled={
                  !hasAccessToken ||
                  actionStoreId === "connect-woocommerce" ||
                  !canInitiateStoreConnection(wooCommerceConnection)
                }
                type="submit"
              >
                {actionStoreId === "connect-woocommerce" ? (
                  <Loader2 className="spin" size={16} aria-hidden="true" />
                ) : (
                  <PlugZap size={16} aria-hidden="true" />
                )}
                {getConnectionButtonLabel("WooCommerce", wooCommerceConnection)}
              </button>
            </form>
          </details>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect Amazon Seller</h2>
              <p>Connect securely through Amazon authorization when your SP-API app is approved.</p>
            </div>
          </div>

          <div className="authorization-fields">
            <label>
              Store name
              <input
                autoComplete="organization"
                onChange={(event) =>
                  setAuthorizationInput((current) => ({
                    ...current,
                    storeName: event.target.value,
                  }))
                }
                placeholder="Amazon UK"
                value={authorizationInput.storeName}
              />
            </label>
            <label>
              Region
              <input
                autoComplete="country"
                onChange={(event) =>
                  setAuthorizationInput((current) => ({ ...current, region: event.target.value }))
                }
                placeholder="GB"
                value={authorizationInput.region}
              />
            </label>
          </div>
          <div className="authorization-card-actions">
            <button
              className={getConnectionButtonClassName(amazonSellerConnection)}
              disabled={
                !hasAccessToken ||
                actionStoreId === "oauth-amazon-seller" ||
                !canInitiateStoreConnection(amazonSellerConnection)
              }
              onClick={() => void startAmazonSellerAuthorization()}
              type="button"
            >
              {actionStoreId === "oauth-amazon-seller" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <ExternalLink size={16} aria-hidden="true" />
              )}
              {getConnectionButtonLabel("Amazon Seller", amazonSellerConnection)}
            </button>
            <span>Requires Amazon SP-API app registration and read-only authorization scopes.</span>
          </div>

          <details className="advanced-manual-setup">
            <summary>Advanced manual setup</summary>
            <p className="manual-setup-note">
              Use this only when you already have valid SP-API tokens from your Amazon developer
              setup.
            </p>
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
                className={getConnectionButtonClassName(amazonSellerConnection)}
                disabled={
                  !hasAccessToken ||
                  actionStoreId === "connect-amazon-seller" ||
                  !canInitiateStoreConnection(amazonSellerConnection)
                }
                type="submit"
              >
                {actionStoreId === "connect-amazon-seller" ? (
                  <Loader2 className="spin" size={16} aria-hidden="true" />
                ) : (
                  <PlugZap size={16} aria-hidden="true" />
                )}
                {getConnectionButtonLabel("Amazon Seller", amazonSellerConnection)}
              </button>
            </form>
          </details>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect TikTok Shop</h2>
              <p>Connect securely through TikTok Shop authorization when your app is approved.</p>
            </div>
          </div>

          <div className="authorization-fields">
            <label>
              Store name
              <input
                autoComplete="organization"
                onChange={(event) =>
                  setAuthorizationInput((current) => ({
                    ...current,
                    storeName: event.target.value,
                  }))
                }
                placeholder="TikTok UK"
                value={authorizationInput.storeName}
              />
            </label>
            <label>
              Region
              <input
                autoComplete="country"
                onChange={(event) =>
                  setAuthorizationInput((current) => ({ ...current, region: event.target.value }))
                }
                placeholder="GB"
                value={authorizationInput.region}
              />
            </label>
          </div>
          <div className="authorization-card-actions">
            <button
              className={getConnectionButtonClassName(tikTokShopConnection)}
              disabled={
                !hasAccessToken ||
                actionStoreId === "oauth-tiktok-shop" ||
                !canInitiateStoreConnection(tikTokShopConnection)
              }
              onClick={() => void startTikTokShopAuthorization()}
              type="button"
            >
              {actionStoreId === "oauth-tiktok-shop" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <ExternalLink size={16} aria-hidden="true" />
              )}
              {getConnectionButtonLabel("TikTok Shop", tikTokShopConnection)}
            </button>
            <span>Requires TikTok Shop app approval before token exchange can be completed.</span>
          </div>

          <details className="advanced-manual-setup">
            <summary>Advanced manual setup</summary>
            <p className="manual-setup-note">
              Use this only when you already have valid TikTok Shop tokens from your app setup.
            </p>
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
                className={getConnectionButtonClassName(tikTokShopConnection)}
                disabled={
                  !hasAccessToken ||
                  actionStoreId === "connect-tiktok-shop" ||
                  !canInitiateStoreConnection(tikTokShopConnection)
                }
                type="submit"
              >
                {actionStoreId === "connect-tiktok-shop" ? (
                  <Loader2 className="spin" size={16} aria-hidden="true" />
                ) : (
                  <PlugZap size={16} aria-hidden="true" />
                )}
                {getConnectionButtonLabel("TikTok Shop", tikTokShopConnection)}
              </button>
            </form>
          </details>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Connect Shopify</h2>
              <p>Connect Shopify securely, approve read-only access, and return to Salense.</p>
            </div>
          </div>

          <div className="authorization-fields">
            <label>
              Shopify shop domain
              <input
                autoComplete="off"
                inputMode="url"
                onChange={(event) =>
                  setAuthorizationInput((current) => ({ ...current, shop: event.target.value }))
                }
                placeholder="northstar.myshopify.com"
                value={authorizationInput.shop}
              />
            </label>
            <label>
              Store name
              <input
                autoComplete="organization"
                onChange={(event) =>
                  setAuthorizationInput((current) => ({
                    ...current,
                    storeName: event.target.value,
                  }))
                }
                placeholder="Shopify UK"
                value={authorizationInput.storeName}
              />
            </label>
          </div>
          <div className="authorization-card-actions">
            <button
              className={getConnectionButtonClassName(shopifyConnection)}
              disabled={
                !hasAccessToken ||
                actionStoreId === "oauth-shopify" ||
                !canInitiateStoreConnection(shopifyConnection)
              }
              onClick={() => void startShopifyAuthorization()}
              type="button"
            >
              {actionStoreId === "oauth-shopify" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <ExternalLink size={16} aria-hidden="true" />
              )}
              {getConnectionButtonLabel("Shopify", shopifyConnection)}
            </button>
            <span>Salense requests read-only Shopify Admin API scopes.</span>
          </div>

          <details className="advanced-manual-setup">
            <summary>Advanced manual setup</summary>
            <p className="manual-setup-note">
              Use this fallback only if you already have a Shopify Admin API access token.
            </p>
            <form
              className="integration-form"
              onSubmit={(event) => void handleShopifyConnect(event)}
            >
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
                className={getConnectionButtonClassName(shopifyConnection)}
                disabled={
                  !hasAccessToken ||
                  actionStoreId === "connect-shopify" ||
                  !canInitiateStoreConnection(shopifyConnection)
                }
                type="submit"
              >
                {actionStoreId === "connect-shopify" ? (
                  <Loader2 className="spin" size={16} aria-hidden="true" />
                ) : (
                  <PlugZap size={16} aria-hidden="true" />
                )}
                {getConnectionButtonLabel("Shopify", shopifyConnection)}
              </button>
            </form>
          </details>
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
  const isSynchronising = store.connectionStatus === StoreConnectionStatus.Synchronising;
  const canDisconnect =
    store.connectionStatus !== StoreConnectionStatus.Disconnected && !isSynchronising;
  const isBusy = actionStoreId === store.id;
  const isActionDisabled = isBusy || isSynchronising;
  const syncAttention = getSyncAttention(syncStatus);

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
          disabled={!isConnected || isActionDisabled || !isSyncEnabled}
          onClick={onManualSync}
          type="button"
        >
          {isBusy || isSynchronising ? (
            <Loader2 className="spin" size={16} aria-hidden="true" />
          ) : (
            <RefreshCcw size={16} aria-hidden="true" />
          )}
          {isSynchronising ? "Synchronising..." : syncAttention ? "Retry sync" : "Sync"}
        </button>
        <button
          disabled={!isConnected || isActionDisabled || !isSyncEnabled}
          onClick={onSchedule}
          type="button"
        >
          <CalendarClock size={16} aria-hidden="true" />
          Schedule
        </button>
        <button
          disabled={isActionDisabled || !isSyncEnabled}
          onClick={onRemoveSchedule}
          type="button"
        >
          <Clock3 size={16} aria-hidden="true" />
          Remove schedule
        </button>
        <button
          disabled={!canDisconnect || isActionDisabled || !isSyncEnabled}
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

export function toPlatformConnectionState(
  stores: readonly ConnectedStore[],
): Partial<Record<StorePlatform, ConnectedStore>> {
  return stores.reduce<Partial<Record<StorePlatform, ConnectedStore>>>((states, store) => {
    if (
      store.connectionStatus === StoreConnectionStatus.Disconnected ||
      states[store.platform] !== undefined
    ) {
      return states;
    }

    return { ...states, [store.platform]: store };
  }, {});
}

export function canInitiateStoreConnection(store: ConnectedStore | null): boolean {
  if (!store) {
    return true;
  }

  return [
    StoreConnectionStatus.AuthenticationExpired,
    StoreConnectionStatus.Disconnected,
    StoreConnectionStatus.Error,
  ].includes(store.connectionStatus);
}

export function getConnectionButtonLabel(
  platformLabel: string,
  store: ConnectedStore | null,
): string {
  switch (store?.connectionStatus) {
    case StoreConnectionStatus.Connected:
      return "Connected";
    case StoreConnectionStatus.Synchronising:
      return "Synchronising...";
    case StoreConnectionStatus.AuthenticationExpired:
      return "Reconnect";
    case StoreConnectionStatus.PendingValidation:
      return "Validating...";
    default:
      return `Connect ${platformLabel}`;
  }
}

export function getConnectionButtonClassName(store: ConnectedStore | null): string {
  const stateClass =
    store?.connectionStatus === StoreConnectionStatus.Connected
      ? " connected"
      : store?.connectionStatus === StoreConnectionStatus.Synchronising
        ? " synchronising"
        : "";

  return `primary-button connection-state-button${stateClass}`;
}

function getDuplicateConnectionNotice(platformLabel: string): string {
  return `${platformLabel} is already connected. Disconnect the existing store before connecting another.`;
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

  const failedCursors = syncStatus.cursors.filter((cursor) => cursor.status === "ERROR").length;
  const activeJobs = syncStatus.jobs.filter((job) =>
    ["ACTIVE", "QUEUED"].includes(job.status),
  ).length;
  const latestJob = getLatestSyncJob(syncStatus.jobs);
  const latestFailure = getSyncAttention(syncStatus);

  return (
    <div className={latestFailure ? "sync-summary attention" : "sync-summary"}>
      <strong>{getPlatformLabel(syncStatus.platform)} sync</strong>
      <span>{syncStatus.cursors.length} resources tracked</span>
      <span>{activeJobs} queued or running jobs</span>
      <span>{failedCursors} resources need attention</span>
      {latestJob ? <span>Latest job: {formatJobStatus(latestJob.status)}</span> : null}
      {latestFailure ? <span className="sync-failure-reason">{latestFailure}</span> : null}
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
    if (error.status === 400) {
      return "Please check your store connection details and try again.";
    }

    if (error.status === 409) {
      return error.message;
    }

    if (error.status >= 500) {
      return "Store connections are temporarily unavailable. Please try again shortly.";
    }

    return "We could not complete that store connection request. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading store integrations.";
}

function getConnectionNotice(store: ConnectedStore, platformLabel: string): string {
  if (store.connectionStatus === StoreConnectionStatus.Connected) {
    return `${store.storeName} connected to ${platformLabel}. Initial read-only sync has been queued.`;
  }

  if (store.connectionStatus === StoreConnectionStatus.Error) {
    return store.validationFailureReason
      ? `${store.storeName} could not be validated. ${store.validationFailureReason}`
      : `${store.storeName} could not be validated. Please check the credentials and try again.`;
  }

  return `${store.storeName} was submitted for ${platformLabel} validation.`;
}

function getSyncAttention(syncStatus: StoreSyncStatus | undefined): string | null {
  if (!syncStatus) {
    return null;
  }

  const failedJob = getLatestSyncJob(syncStatus.jobs.filter((job) => job.status === "FAILED"));

  if (failedJob?.failedReason) {
    return failedJob.failedReason;
  }

  const failedCursor = syncStatus.cursors.find((cursor) => cursor.status === "ERROR");
  const cursorMessage = failedCursor?.errorSummary?.message;

  return typeof cursorMessage === "string" && cursorMessage.trim() ? cursorMessage : null;
}

function getLatestSyncJob(jobs: readonly StoreSyncJobStatus[]): StoreSyncJobStatus | undefined {
  return [...jobs].sort((first, second) => {
    const firstTime = new Date(first.finishedAt ?? first.queuedAt).getTime();
    const secondTime = new Date(second.finishedAt ?? second.queuedAt).getTime();

    return secondTime - firstTime;
  })[0];
}

function formatJobStatus(status: StoreSyncJobStatus["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Running";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "QUEUED":
      return "Queued";
    case "UNKNOWN":
      return "Unknown";
  }
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
