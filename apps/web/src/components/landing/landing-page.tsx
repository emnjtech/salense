"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  CirclePlay,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

export function LandingPage() {
  const [heroImageReady, setHeroImageReady] = useState(true);

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="Salense home">
          <Image alt="Salense" height={42} priority src="/brand/salense-logo-dark.svg" width={148} />
        </Link>
        <nav className="landing-nav-links" aria-label="Primary navigation">
          <Link href="/integrations">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
        </nav>
        <div className="landing-nav-actions">
          <Link href="/login">Login</Link>
          <Link className="primary-button" href="/pricing">Get started</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-pill">
            <span aria-hidden="true" />
            All your stores. One intelligent view.
          </span>
          <h1>
            Commerce intelligence that <strong>drives growth.</strong>
          </h1>
          <p>
            Salense connects your Shopify, WooCommerce, Amazon, TikTok Shop and more,
            transforming your data into clear insights, smart recommendations and measurable
            business growth.
          </p>
          <div className="landing-hero-actions">
            <Link className="primary-button landing-primary-action" href="/pricing">
              Get started
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="secondary-button landing-video-action" href="/how-it-works">
              See how it works
              <CirclePlay size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="landing-trust-list">
            <li><Check size={15} aria-hidden="true" />14-day free trial</li>
            <li><Check size={15} aria-hidden="true" />No credit card required</li>
            <li><Check size={15} aria-hidden="true" />Cancel anytime</li>
          </ul>
        </div>

        <div className="landing-hero-media" aria-label="Salense product screenshot">
          {heroImageReady ? (
            <Image
              alt="Salense commerce intelligence dashboard"
              className="landing-hero-image"
              height={760}
              onError={() => setHeroImageReady(false)}
              priority
              src="/landingPage/hero.png"
              width={1040}
            />
          ) : (
            <div className="landing-media-fallback">
              <BarChart3 size={34} aria-hidden="true" />
              <strong>Product screenshot coming soon</strong>
              <span>Place the hero image at apps/web/public/landingPage/hero.png.</span>
            </div>
          )}
        </div>
      </section>

      <section className="landing-feature-band">
        <div className="landing-feature-copy">
          <p className="eyebrow">Built for modern commerce</p>
          <h2>Unify your data. Understand your business. Grow with confidence.</h2>
          <p>
            Salense brings commerce data into one intelligent platform, giving you clarity and
            confidence to make decisions that drive real results.
          </p>
          <Link href="/pricing">
            Explore all features
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="landing-feature-grid">
          <FeatureCard
            icon={<BarChart3 size={26} aria-hidden="true" />}
            title="Unified Dashboard"
            text="See all your stores, metrics and performance in one place."
          />
          <FeatureCard
            icon={<Sparkles size={26} aria-hidden="true" />}
            title="Smart Insights"
            text="Understand the signals behind revenue, orders, customers and inventory."
          />
          <FeatureCard
            icon={<RefreshCw size={26} aria-hidden="true" />}
            title="Real-time Sync"
            text="Automatic, reliable data sync across all your sales channels."
          />
          <FeatureCard
            icon={<ShieldCheck size={26} aria-hidden="true" />}
            title="Actionable Reports"
            text="Track, analyse and review performance across connected platforms."
          />
        </div>
      </section>

      <section className="landing-scale-section">
        <h2>Everything you need to scale smarter</h2>
        <div className="landing-scale-grid">
          {[
            "Multi-store Integration",
            "Business Health Score",
            "Inventory Intelligence",
            "Customer Insights",
            "Secure & Reliable",
          ].map((item) => (
            <article key={item}>
              <ShieldCheck size={30} aria-hidden="true" />
              <strong>{item}</strong>
              <p>Built to help commerce teams make clearer decisions across every channel.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <p className="eyebrow">Ready to grow?</p>
          <h2>Get started with Salense today</h2>
          <p>
            Request an invitation for a free 30-day trial and see how Salense can transform your
            business.
          </p>
          <div className="landing-cta-actions">
            <Link className="secondary-button" href="/pricing">
              Get started
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/pricing">
              View pricing
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ul>
          <li><Check size={16} aria-hidden="true" />No credit card required</li>
          <li><Check size={16} aria-hidden="true" />14-day free trial</li>
          <li><Check size={16} aria-hidden="true" />Cancel anytime</li>
        </ul>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  text,
  title,
}: {
  readonly icon: ReactNode;
  readonly text: string;
  readonly title: string;
}) {
  return (
    <article className="landing-feature-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
