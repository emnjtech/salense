import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { pricingPlans } from "./subscription-plans";

export function PricingPage() {
  return (
    <main className="public-page pricing-page">
      <header className="public-nav">
        <Link className="public-brand" href="/login" aria-label="Salense login">
          <Image
            alt="Salense"
            height={44}
            priority
            src="/brand/salense-logo-dark.svg"
            width={142}
          />
        </Link>
        <div className="public-nav-actions">
          <Link href="/login">Sign in</Link>
          <Link className="primary-button" href="/request-invitation">
            Request invitation
          </Link>
        </div>
      </header>

      <section className="pricing-hero">
        <p className="eyebrow">Private Beta / Early Access</p>
        <h1>Pricing for commerce teams that need clarity across every channel.</h1>
        <p>
          Salense is currently onboarding selected businesses for a free 30-day trial. Choose the
          plan that best fits your operating model and request an invitation.
        </p>
      </section>

      <section className="pricing-grid" aria-label="Salense pricing plans">
        {pricingPlans.map((plan) => (
          <article className="panel pricing-card" key={plan.plan}>
            <div>
              <p className="eyebrow">{plan.bestFor}</p>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
            </div>
            <div className="pricing-price">
              <strong>{plan.monthlyPrice}</strong>
              <span>/month</span>
            </div>
            <dl className="pricing-limits">
              <div>
                <dt>Connected stores</dt>
                <dd>{plan.connectedStoreLimit}</dd>
              </div>
              <div>
                <dt>Team members</dt>
                <dd>{plan.teamMemberLimit}</dd>
              </div>
            </dl>
            <ul className="pricing-features">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              className="primary-button pricing-action"
              href={`/request-invitation?plan=${plan.plan}`}
            >
              Request invitation
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
