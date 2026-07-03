import { BarChart3, Link2, Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthenticatedLayoutProps {
  readonly children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Salense workspace navigation">
        <div className="brand-lockup">
          <span className="brand-mark">S</span>
          <div>
            <strong>Salense</strong>
            <span>Commerce intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link href="/" aria-disabled="true">
            <BarChart3 size={18} aria-hidden="true" />
            Dashboard
          </Link>
          <Link href="/store-integrations" aria-current="page">
            <Link2 size={18} aria-hidden="true" />
            Store Integrations
          </Link>
          <Link href="/" aria-disabled="true">
            <Settings size={18} aria-hidden="true" />
            Settings
          </Link>
        </nav>
      </aside>

      <div className="workspace-frame">{children}</div>
    </div>
  );
}
