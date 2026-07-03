"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { readDemoSession } from "../../lib/auth-session";
import { FormMessage } from "./auth-page-shell";

export function CompanyProfileForm() {
  const router = useRouter();
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [form, setForm] = useState({
    businessLogoUrl: "",
    businessName: "",
    country: "GB",
    currency: "GBP",
    industry: "Retail",
    taxPreference: "Standard",
    timeZone: "Europe/London",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const session = readDemoSession();

    if (!session) {
      setLoading(false);
      setError("Sign in before updating the company profile.");
      return;
    }

    try {
      const profile = await authClient.updateCompanyProfile(session.accessToken, {
        ...form,
        ...(form.businessLogoUrl.trim() ? { businessLogoUrl: form.businessLogoUrl.trim() } : {}),
      });
      setSuccess(`${profile.businessName} is ready for store integrations.`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save company profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="workspace compact-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Company setup</p>
          <h1>Give Salense the business context it needs.</h1>
          <p>Complete the Version 1 company profile before connecting commerce stores.</p>
        </div>
      </header>

      <section className="panel setup-panel">
        {success ? <FormMessage tone="success">{success}</FormMessage> : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <form className="auth-form two-column" onSubmit={(event) => void handleSubmit(event)}>
          <label className="span-two">
            Business name
            <input
              autoComplete="organization"
              onChange={(event) =>
                setForm((current) => ({ ...current, businessName: event.target.value }))
              }
              required
              value={form.businessName}
            />
          </label>
          <label className="span-two">
            Business logo URL
            <input
              inputMode="url"
              onChange={(event) =>
                setForm((current) => ({ ...current, businessLogoUrl: event.target.value }))
              }
              placeholder="https://example.com/logo.png"
              type="url"
              value={form.businessLogoUrl}
            />
          </label>
          <label>
            Country
            <input
              maxLength={2}
              minLength={2}
              onChange={(event) =>
                setForm((current) => ({ ...current, country: event.target.value }))
              }
              required
              value={form.country}
            />
          </label>
          <label>
            Currency
            <input
              maxLength={3}
              minLength={3}
              onChange={(event) =>
                setForm((current) => ({ ...current, currency: event.target.value }))
              }
              required
              value={form.currency}
            />
          </label>
          <label>
            Time zone
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, timeZone: event.target.value }))
              }
              required
              value={form.timeZone}
            />
          </label>
          <label>
            Industry
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, industry: event.target.value }))
              }
              required
              value={form.industry}
            />
          </label>
          <label className="span-two">
            Tax preference
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, taxPreference: event.target.value }))
              }
              required
              value={form.taxPreference}
            />
          </label>
          <button className="primary-button span-two" disabled={loading} type="submit">
            {loading ? "Saving profile..." : "Save company profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
