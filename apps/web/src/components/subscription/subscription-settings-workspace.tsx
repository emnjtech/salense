"use client";

import { AlertCircle, Loader2, Store, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createStoreIntegrationsApiClient,
  StoreConnectionStatus,
} from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { pricingPlans, SubscriptionPlan } from "./subscription-plans";

export function SubscriptionSettingsWorkspace() {
  const storeClient = useMemo(
    () =>
      createStoreIntegrationsApiClient({
        accessTokenProvider: () => readDemoSession()?.accessToken ?? null,
      }),
    [],
  );
  const [connectedStores, setConnectedStores] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const professionalPlan = pricingPlans.find((plan) => plan.plan === SubscriptionPlan.Professional);

  useEffect(() => {
    let mounted = true;

    async function loadUsage() {
      try {
        const stores = await storeClient.listConnectedStores();

        if (!mounted) {
          return;
        }

        setConnectedStores(
          stores.filter(
            (store) => store.connectionStatus !== StoreConnectionStatus.Disconnected,
          ).length,
        );
        setError(null);
      } catch (caughtError) {
        if (!mounted) {
          return;
        }

        setError(getFriendlyAuthErrorMessage(caughtError));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      mounted = false;
    };
  }, [storeClient]);

  return (
    <main className="workspace settings-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Subscription</p>
          <h1>Plan and trial</h1>
          <p>
            Review the current Salense workspace plan status, store usage, and early-access trial
            options.
          </p>
        </div>
        <Link className="secondary-button" href="/settings">
          Back to Settings
        </Link>
      </header>

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      <section className="subscription-status-grid">
        <article className="panel subscription-status-card highlight">
          <p className="eyebrow">Current status</p>
          <h2>Private Beta / Early Access</h2>
          <p>
            Payments are not live. Salense is onboarding selected businesses for a free 30-day
            trial by invitation.
          </p>
          <Link className="primary-button" href="/request-invitation?plan=PROFESSIONAL">
            Request Professional invitation
          </Link>
        </article>

        <article className="panel subscription-status-card">
          <Store size={20} aria-hidden="true" />
          <span>Connected stores usage</span>
          {loading ? (
            <p className="subscription-usage-loading">
              <Loader2 className="spin" size={16} aria-hidden="true" />
              Loading usage...
            </p>
          ) : (
            <strong>
              {connectedStores ?? 0} of{" "}
              {professionalPlan?.connectedStoreLimit ?? "6 connected stores"}
            </strong>
          )}
          <Link href="/store-integrations">Manage store connections</Link>
        </article>

        <article className="panel subscription-status-card">
          <Users size={20} aria-hidden="true" />
          <span>Team members usage</span>
          <strong>1 active owner seat</strong>
          <p>Team management is planned for a later workspace release.</p>
        </article>
      </section>

      <section className="panel subscription-plan-panel" aria-labelledby="subscription-plans-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Available plans</p>
            <h2 id="subscription-plans-title">Choose a plan for your workspace</h2>
          </div>
        </div>
        <div className="subscription-plan-list">
          {pricingPlans.map((plan) => (
            <Link
              className="subscription-plan-row"
              href={`/request-invitation?plan=${plan.plan}`}
              key={plan.plan}
            >
              <span>
                <strong>{plan.name}</strong>
                {plan.bestFor}
              </span>
              <span>{plan.monthlyPrice}/month</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
