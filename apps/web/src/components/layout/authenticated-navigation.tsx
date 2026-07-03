"use client";

import {
  BarChart3,
  Building2,
  Link2,
  ListOrdered,
  LogOut,
  PackageSearch,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { clearDemoSession, readDemoSession, type DemoSession } from "../../lib/auth-session";

export function AuthenticatedNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setSession(readDemoSession());
  }, []);

  async function handleLogout() {
    const currentSession = readDemoSession();
    setLoggingOut(true);

    try {
      if (currentSession) {
        await authClient.logout(currentSession.refreshToken);
      }
    } catch {
      // Local demo logout still clears the browser session if the server token is already invalid.
    } finally {
      clearDemoSession();
      setSession(null);
      setLoggingOut(false);
      router.push("/login");
    }
  }

  return (
    <aside className="sidebar" aria-label="Salense workspace navigation">
      <div className="brand-lockup">
        <span className="brand-mark">S</span>
        <div>
          <strong>Salense</strong>
          <span>Commerce intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavigationLink currentPath={pathname} href="/today" icon={<BarChart3 size={18} />}>
          Today
        </NavigationLink>
        <NavigationLink currentPath={pathname} href="/orders" icon={<ListOrdered size={18} />}>
          Orders
        </NavigationLink>
        <NavigationLink currentPath={pathname} href="/products" icon={<PackageSearch size={18} />}>
          Products
        </NavigationLink>
        <NavigationLink
          currentPath={pathname}
          href="/store-integrations"
          icon={<Link2 size={18} />}
        >
          Store Integrations
        </NavigationLink>
        <NavigationLink
          currentPath={pathname}
          href="/company-profile"
          icon={<Building2 size={18} />}
        >
          Company Setup
        </NavigationLink>
        <Link href="/" aria-disabled="true">
          <Settings size={18} aria-hidden="true" />
          Settings
        </Link>
      </nav>

      <div className="sidebar-session">
        <span>{session?.userEmail ?? "Demo session not loaded"}</span>
        <button onClick={() => void handleLogout()} type="button">
          <LogOut size={16} aria-hidden="true" />
          {loggingOut ? "Signing out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}

function NavigationLink({
  children,
  currentPath,
  href,
  icon,
}: {
  readonly children: string;
  readonly currentPath: string;
  readonly href: string;
  readonly icon: ReactNode;
}) {
  return (
    <Link href={href} aria-current={currentPath === href ? "page" : undefined}>
      {icon}
      {children}
    </Link>
  );
}
