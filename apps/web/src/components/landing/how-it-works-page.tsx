"use client";

import { ArrowLeft, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function HowItWorksPage() {
  const [videoReady, setVideoReady] = useState(true);

  return (
    <main className="how-page">
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="Salense home">
          <Image
            alt="Salense"
            height={44}
            priority
            src="/brand/salense-logo-dark.svg"
            width={142}
          />
        </Link>
        <div className="public-nav-actions">
          <Link href="/pricing">Pricing</Link>
          <Link className="primary-button" href="/login">
            Login
          </Link>
        </div>
      </header>

      <section className="how-hero">
        <p className="eyebrow">Product walkthrough</p>
        <h1>See how Salense works</h1>
        <p>
          A short walkthrough of how Salense turns connected commerce data into one clear operating
          view. The video is designed to be under two minutes.
        </p>
      </section>

      <section className="panel how-video-panel" aria-label="Salense product walkthrough video">
        {videoReady ? (
          <video
            controls
            onError={() => setVideoReady(false)}
            preload="metadata"
            src="/how-salense-works.mp4"
          >
            <track kind="captions" />
          </video>
        ) : (
          <div className="how-video-fallback">
            <PlayCircle size={42} aria-hidden="true" />
            <strong>Walkthrough video coming soon</strong>
            <span>Place the video at apps/web/public/how-salense-works.mp4.</span>
          </div>
        )}
      </section>

      <footer className="how-actions">
        <Link className="secondary-button" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Home
        </Link>
        <Link className="secondary-button" href="/pricing">
          View Pricing
        </Link>
        <Link className="primary-button" href="/login">
          Login
        </Link>
      </footer>
    </main>
  );
}
