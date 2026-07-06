"use client";

import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { createSubscriptionApiClient } from "../../lib/api/subscription-client";
import {
  getPlanByValue,
  pricingPlans,
  SubscriptionPlatform,
  subscriptionPlatforms,
  type SubscriptionPlan,
} from "./subscription-plans";

interface RequestInvitationPageProps {
  readonly initialPlan?: string | undefined;
}

interface InvitationFormState {
  readonly businessName: string;
  readonly fullName: string;
  readonly message: string;
  readonly phoneNumber: string;
  readonly platforms: readonly SubscriptionPlatform[];
  readonly preferredPlan: SubscriptionPlan;
  readonly websiteUrl: string;
  readonly workEmail: string;
}

type OptionalInvitationFields = Partial<{
  readonly message: string;
  readonly phoneNumber: string;
  readonly websiteUrl: string;
}>;

export function RequestInvitationPage({ initialPlan }: RequestInvitationPageProps) {
  const selectedPlan = getPlanByValue(initialPlan);
  const client = useMemo(() => createSubscriptionApiClient(), []);
  const [form, setForm] = useState<InvitationFormState>({
    businessName: "",
    fullName: "",
    message: "",
    phoneNumber: "",
    platforms: [SubscriptionPlatform.Shopify],
    preferredPlan: selectedPlan.plan,
    websiteUrl: "",
    workEmail: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const invitationRequest = {
        businessName: form.businessName,
        fullName: form.fullName,
        platforms: form.platforms,
        preferredPlan: form.preferredPlan,
        workEmail: form.workEmail,
        ...toOptionalField("message", form.message),
        ...toOptionalField("phoneNumber", form.phoneNumber),
        ...toOptionalField("websiteUrl", form.websiteUrl),
      };

      await client.requestInvitation(invitationRequest);
      setSubmitted(true);
    } catch {
      setError("We could not send your invitation request. Please check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-page invitation-page">
      <header className="public-nav">
        <Link className="public-brand" href="/pricing" aria-label="Salense pricing">
          <Image
            alt="Salense"
            height={44}
            priority
            src="/brand/salense-logo-dark.svg"
            width={142}
          />
        </Link>
        <Link className="secondary-button" href="/pricing">
          <ArrowLeft size={16} aria-hidden="true" />
          Pricing
        </Link>
      </header>

      {submitted ? (
        <section className="panel invitation-confirmation" role="status">
          <CheckCircle2 size={34} aria-hidden="true" />
          <p className="eyebrow">Request received</p>
          <h1>Thank you for your interest in Salense.</h1>
          <p>
            We are currently onboarding selected businesses for a free 30-day trial. Your invitation
            request has been received and our team will contact you.
          </p>
          <div className="invitation-confirmation-actions">
            <Link className="primary-button" href="/login">
              Sign in
            </Link>
            <Link className="secondary-button" href="/pricing">
              Back to Pricing
            </Link>
          </div>
        </section>
      ) : (
        <section className="invitation-layout">
          <div className="invitation-copy">
            <p className="eyebrow">Request invitation</p>
            <h1>Start a free 30-day Salense trial.</h1>
            <p>
              Tell us about your commerce setup and the plan you are interested in. We will review
              your request and contact you about early access.
            </p>
            <div className="panel invitation-plan-summary">
              <span>Selected plan</span>
              <strong>{getPlanByValue(form.preferredPlan).name}</strong>
              <p>{getPlanByValue(form.preferredPlan).bestFor}</p>
            </div>
          </div>

          <form className="panel invitation-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input
                autoComplete="name"
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
                value={form.fullName}
              />
            </label>
            <label>
              Business name
              <input
                autoComplete="organization"
                onChange={(event) => setForm({ ...form, businessName: event.target.value })}
                required
                value={form.businessName}
              />
            </label>
            <label>
              Work email
              <input
                autoComplete="email"
                onChange={(event) => setForm({ ...form, workEmail: event.target.value })}
                required
                type="email"
                value={form.workEmail}
              />
            </label>
            <label>
              Phone number <span>Optional</span>
              <input
                autoComplete="tel"
                onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
                value={form.phoneNumber}
              />
            </label>
            <label>
              Website or store URL <span>Optional</span>
              <input
                autoComplete="url"
                onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
                value={form.websiteUrl}
              />
            </label>
            <label>
              Preferred plan
              <select
                onChange={(event) =>
                  setForm({ ...form, preferredPlan: event.target.value as SubscriptionPlan })
                }
                value={form.preferredPlan}
              >
                {pricingPlans.map((plan) => (
                  <option key={plan.plan} value={plan.plan}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="platform-checkboxes">
              <legend>Platforms used</legend>
              {subscriptionPlatforms.map((platform) => (
                <label key={platform.value}>
                  <input
                    checked={form.platforms.includes(platform.value)}
                    onChange={() =>
                      setForm({
                        ...form,
                        platforms: togglePlatform(form.platforms, platform.value),
                      })
                    }
                    type="checkbox"
                  />
                  {platform.label}
                </label>
              ))}
            </fieldset>
            <label className="span-two">
              Message <span>Optional</span>
              <textarea
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                rows={4}
                value={form.message}
              />
            </label>
            {error ? (
              <div className="form-message error span-two" role="alert">
                {error}
              </div>
            ) : null}
            <button className="primary-button span-two" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
              Request invitation
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function toOptionalField(
  key: keyof OptionalInvitationFields,
  value: string,
): OptionalInvitationFields {
  const normalised = value.trim();

  return normalised ? { [key]: normalised } : {};
}

function togglePlatform(
  platforms: readonly SubscriptionPlatform[],
  platform: SubscriptionPlatform,
): readonly SubscriptionPlatform[] {
  if (platforms.includes(platform)) {
    const nextPlatforms = platforms.filter((currentPlatform) => currentPlatform !== platform);

    return nextPlatforms.length > 0 ? nextPlatforms : platforms;
  }

  return [...platforms, platform];
}
