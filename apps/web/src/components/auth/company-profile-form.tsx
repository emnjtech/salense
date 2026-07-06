"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { readDemoSession } from "../../lib/auth-session";
import {
  acceptedCompanyLogoInputTypes,
  CompanyLogoUploadError,
  storeCompanyLogoForLocalProfile,
  validateCompanyLogoFile,
  type StoredCompanyLogo,
} from "../../lib/company-logo-upload";
import { FormMessage } from "./auth-page-shell";

export function CompanyProfileForm() {
  const router = useRouter();
  const authClient = useMemo(() => createAuthApiClient(), []);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    businessLogoUrl: null as string | null,
    businessName: "",
    country: "GB",
    currency: "GBP",
    industry: "Retail",
    taxPreference: "Standard",
    timeZone: "Europe/London",
  });
  const [logoPreview, setLogoPreview] = useState<StoredCompanyLogo | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetLogoInput() {
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validation = validateCompanyLogoFile(file);

    if (!validation.ok) {
      setLogoError(validation.message);
      resetLogoInput();
      return;
    }

    try {
      const storedLogo = await storeCompanyLogoForLocalProfile(file);
      setLogoPreview(storedLogo);
      setLogoError(null);
      setForm((current) => ({ ...current, businessLogoUrl: storedLogo.dataUrl }));
    } catch (caughtError) {
      setLogoError(
        caughtError instanceof CompanyLogoUploadError
          ? caughtError.message
          : "We could not upload that logo. Try another image.",
      );
      resetLogoInput();
    }
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setLogoError(null);
    setForm((current) => ({ ...current, businessLogoUrl: null }));
    resetLogoInput();
  }

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
      });
      setSuccess(`${profile.businessName} is ready for store integrations.`);
      router.refresh();
    } catch (caughtError) {
      setError(getFriendlyCompanyProfileError(caughtError));
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
          <p>Complete the company profile before connecting commerce stores.</p>
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
          <section className="span-two company-logo-upload" aria-labelledby="company-logo-title">
            <div>
              <h2 id="company-logo-title">Business logo</h2>
              <p>Upload a PNG, JPG, SVG, or WebP logo up to 2MB.</p>
            </div>
            <div className="company-logo-upload-body">
              {logoPreview ? (
                <div className="company-logo-preview">
                  <Image
                    alt="Business logo preview"
                    height={84}
                    src={logoPreview.dataUrl}
                    unoptimized
                    width={84}
                  />
                  <div>
                    <strong>{logoPreview.fileName}</strong>
                    <span>{formatFileSize(logoPreview.size)}</span>
                  </div>
                </div>
              ) : (
                <div className="company-logo-placeholder" aria-hidden="true">
                  Logo
                </div>
              )}
              <div className="company-logo-actions">
                <label className="secondary-button company-logo-file-button">
                  {logoPreview ? "Replace logo" : "Upload logo"}
                  <input
                    ref={logoInputRef}
                    accept={acceptedCompanyLogoInputTypes}
                    onChange={(event) => void handleLogoChange(event)}
                    type="file"
                  />
                </label>
                {logoPreview ? (
                  <button className="ghost-button" onClick={handleRemoveLogo} type="button">
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            {logoError ? (
              <FormMessage tone="error">{logoError}</FormMessage>
            ) : null}
          </section>
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function getFriendlyCompanyProfileError(error: unknown): string {
  if (error instanceof Error && /businessLogoUrl|logo/i.test(error.message)) {
    return "Upload a PNG, JPG, SVG, or WebP logo up to 2MB.";
  }

  return error instanceof Error ? error.message : "Unable to save company profile.";
}
