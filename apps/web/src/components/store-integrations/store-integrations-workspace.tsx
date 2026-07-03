"use client";

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Link2,
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

interface WooCommerceFormState {
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly storeName: string;
  readonly storeUrl: string;
}

const emptyWooCommerceForm: WooCommerceFormState = {
  consumerKey: "",
  consumerSecret: "",
  storeName: "",
  storeUrl: "",
};

export function StoreIntegrationsWorkspace() {
  const [platforms, setPlatforms] = useState<readonly SupportedStorePlatform[]>([]);
  const [stores, setStores] = useState<readonly ConnectedStore[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Readonly<Record<string, StoreSyncStatus>>>({});
  const [formState, setFormState] = useState<WooCommerceFormState>(emptyWooCommerceForm);
  const [loading, setLoading] = useState(true);
  const [actionStoreId, setActionStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apiClient = useMemo(
    () =>
      createStoreIntegrationsApiClient({
        accessTokenProvider: getAccessToken,
      }),
    [],
  );

  const hasAccessToken = Boolean(getAccessToken());

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const supportedPlatforms = await apiClient.listSupportedPlatforms();
      setPlatforms(supportedPlatforms);

      if (!getAccessToken()) {
        setStores([]);
        setSyncStatuses({});
        return;
      }

      const connectedStores = await apiClient.listConnectedStores();
      setStores(connectedStores);

      const statuses = await Promise.all(
        connectedStores
          .filter((store) => store.platform === StorePlatform.WooCommerce)
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

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Store Integrations</p>
          <h1>Connect commerce data without changing marketplace records.</h1>
          <p>
            Manage supported platforms, monitor WooCommerce sync health, and keep imports read-only
            from the first connection.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadWorkspace()}>
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {!hasAccessToken ? (
        <section className="state-banner warning" aria-live="polite">
          <ShieldCheck size={18} aria-hidden="true" />
          Add a valid access token to this browser session before managing protected store
          connections.
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
          label="WooCommerce stores"
          value={stores
            .filter((store) => store.platform === StorePlatform.WooCommerce)
            .length.toString()}
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
              <p>WooCommerce is active first. Amazon Seller and TikTok Shop remain placeholders.</p>
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
                Consumer credentials are sent only to the API for encrypted storage and validation.
              </p>
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
      </div>

      <section className="panel stores-panel">
        <div className="panel-heading">
          <div>
            <h2>Connected Stores</h2>
            <p>Connection state, last sync, and safe WooCommerce sync summaries.</p>
          </div>
        </div>

        {loading ? <LoadingRows /> : null}
        {!loading && stores.length === 0 ? (
          <EmptyState
            title="No connected stores"
            body="Connect WooCommerce when the business is ready to import read-only commerce data."
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
  const isWooCommerce = store.platform === StorePlatform.WooCommerce;
  const isConnected = store.connectionStatus === StoreConnectionStatus.Connected;
  const isBusy = actionStoreId === store.id;

  return (
    <article className="store-row">
      <div className="store-main">
        <div className="store-title-row">
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

      {isWooCommerce ? <SyncSummary syncStatus={syncStatus} /> : <PlaceholderSummary />}

      <div className="store-actions" aria-label={`Actions for ${store.storeName}`}>
        <button
          disabled={!isConnected || isBusy || !isWooCommerce}
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
          disabled={!isConnected || isBusy || !isWooCommerce}
          onClick={onSchedule}
          type="button"
        >
          <CalendarClock size={16} aria-hidden="true" />
          Schedule
        </button>
        <button disabled={isBusy || !isWooCommerce} onClick={onRemoveSchedule} type="button">
          <Clock3 size={16} aria-hidden="true" />
          Remove schedule
        </button>
        <button
          disabled={!isConnected || isBusy || !isWooCommerce}
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
      <strong>WooCommerce sync</strong>
      <span>{syncStatus.cursors.length} resources tracked</span>
      <span>{activeJobs} queued or running jobs</span>
      <span>{failedCursors} resources need attention</span>
    </div>
  );
}

function PlaceholderSummary() {
  return (
    <div className="sync-summary muted">
      <strong>Placeholder</strong>
      <span>Connection UI is reserved for a future platform implementation.</span>
    </div>
  );
}

function PlatformRow({ platform }: { readonly platform: SupportedStorePlatform }) {
  const isWooCommerce = platform.platform === StorePlatform.WooCommerce;

  return (
    <article className="platform-row">
      <div className="platform-icon">
        <Link2 size={18} aria-hidden="true" />
      </div>
      <div>
        <h3>{platform.label}</h3>
        <p>
          {isWooCommerce
            ? "Credential validation and read-only sync available."
            : "Supported platform placeholder."}
        </p>
      </div>
      <span className={isWooCommerce ? "platform-state active" : "platform-state"}>
        {isWooCommerce ? "Active" : "Planned"}
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

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem("salense.accessToken") ?? window.localStorage.getItem("accessToken")
  );
}

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading store integrations.";
}

function getPlatformLabel(platform: StorePlatform): string {
  switch (platform) {
    case StorePlatform.AmazonSeller:
      return "Amazon Seller";
    case StorePlatform.TikTokShop:
      return "TikTok Shop";
    case StorePlatform.WooCommerce:
      return "WooCommerce";
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
