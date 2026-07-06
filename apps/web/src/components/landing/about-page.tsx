import { ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const principles = [
  "Marketplace platforms remain the source of truth.",
  "Salense keeps channel identity intact across every report.",
  "Commerce insights are explainable, traceable and grounded in connected data.",
];

export function AboutPage() {
  return (
    <main className="public-page public-content-page">
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="Salense home">
          <Image alt="Salense" height={44} priority src="/brand/salense-logo-dark.svg" width={142} />
        </Link>
        <div className="public-nav-actions">
          <Link href="/integrations">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
          <Link className="primary-button" href="/login">
            Login
          </Link>
        </div>
      </header>

      <section className="public-story-hero">
        <p className="eyebrow">About Salense</p>
        <h1>Commerce intelligence for businesses selling across multiple channels.</h1>
        <p>
          Salense is a commerce intelligence platform built to help businesses understand
          performance across all connected sales channels, from daily decisions to deeper
          historical analysis.
        </p>
        <div className="public-story-actions">
          <Link className="primary-button" href="/pricing">
            Request invitation
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="secondary-button" href="/integrations">
            View integrations
          </Link>
        </div>
      </section>

      <section className="public-story-grid" aria-label="Salense company approach">
        <article className="panel public-story-card">
          <p className="eyebrow">What Salense is</p>
          <h2>One operating view for connected commerce.</h2>
          <p>
            Salense brings orders, products, customers, inventory and performance metrics into a
            single workspace so growing teams can see what is happening across every store.
          </p>
        </article>
        <article className="panel public-story-card">
          <p className="eyebrow">Why Salense exists</p>
          <h2>Commerce data should be clear before it is clever.</h2>
          <p>
            Multi-channel sellers often make decisions from scattered dashboards. Salense exists to
            turn that fragmented data into a reliable picture of business performance.
          </p>
        </article>
        <article className="panel public-story-card">
          <p className="eyebrow">Our approach</p>
          <h2>Read-only commerce intelligence.</h2>
          <p>
            Salense analyses connected commerce data without modifying marketplace records. Your
            sales channels remain the operational systems of record.
          </p>
        </article>
        <article className="panel public-story-card">
          <p className="eyebrow">Built for growing teams</p>
          <h2>Practical clarity for day-to-day operators.</h2>
          <p>
            The product is designed for owners and commerce teams who need fast answers about
            sales, stock, customers and channel performance without losing source-level detail.
          </p>
        </article>
      </section>

      <section className="panel public-philosophy">
        <div>
          <p className="eyebrow">Platform philosophy</p>
          <h2>Source integrity, explainable intelligence and business clarity.</h2>
          <p>
            Salense keeps every platform distinct, preserves business ownership and presents
            deterministic analytics in language teams can trust.
          </p>
        </div>
        <ul>
          {principles.map((principle) => (
            <li key={principle}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>{principle}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
