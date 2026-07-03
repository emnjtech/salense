import Link from "next/link";
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
          <span className="brand-mark">S</span>
          <strong>Salense</strong>
        </Link>
        <div>
          <p className="eyebrow">Commerce intelligence</p>
          <h1>One calm workspace for knowing what changed and what needs attention.</h1>
          <p>
            Start with secure account access, complete the business profile, then connect stores for
            read-only intelligence.
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
