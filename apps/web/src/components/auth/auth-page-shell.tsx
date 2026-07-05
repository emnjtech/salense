import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

interface AuthPageShellProps {
  readonly children: ReactNode;
  readonly eyebrow: string;
  readonly footer?: ReactNode;
  readonly title: string;
  readonly summary: string;
}

export function AuthPageShell({ children, eyebrow, footer, title, summary }: AuthPageShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Salense introduction">
        <Link className="auth-brand" href="/login">
          <Image
            alt="Salense"
            className="auth-logo"
            height={46}
            priority
            src="/brand/salense-logo-light.svg"
            width={150}
          />
        </Link>
        <div className="auth-illustration-wrap">
          <Image
            alt=""
            className="auth-illustration"
            height={720}
            priority
            src="/illustrations/login-hero.png"
            width={720}
          />
        </div>
        <div className="auth-story-copy">
          <p className="eyebrow">Commerce Intelligence</p>
          <h1>One calm workspace for knowing what changed and what needs attention.</h1>
          <p>
            Start with secure account access, complete the business profile, then connect stores.
          </p>
        </div>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="auth-title">{title}</h2>
        <p>{summary}</p>
        {children}
        {footer ? <footer className="auth-footer">{footer}</footer> : null}
      </section>
    </main>
  );
}

export function FormMessage({
  children,
  tone,
}: {
  readonly children: ReactNode;
  readonly tone: "error" | "success" | "info";
}) {
  return (
    <div className={`form-message ${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
