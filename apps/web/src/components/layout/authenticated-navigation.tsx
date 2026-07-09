"use client";

import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChartNoAxesColumnIncreasing,
  Link2,
  ListOrdered,
  LogOut,
  Megaphone,
  PackageSearch,
  ShieldCheck,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { clearDemoSession, readDemoSession, type DemoSession } from "../../lib/auth-session";

export function AuthenticatedNavigation() {
  const pathname = usePathname() ?? "";
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
      // Local logout still clears the browser session if the server token is already invalid.
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
        <Image
          alt="Salense"
          className="sidebar-logo"
          height={40}
          priority
          src="/brand/salense-logo-light.svg"
          width={128}
        />
        <div>
          <span>Commerce Intelligence</span>
        </div>
      </div>

      <div className="sidebar-business-card" aria-label="Active business">
        <div>
          <span>Active business</span>
          <strong>{session?.businessName ?? "Your business"}</strong>
        </div>
        <ChevronDown size={16} aria-hidden="true" />
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
        <NavigationLink currentPath={pathname} href="/customers" icon={<Users size={18} />}>
          Customers
        </NavigationLink>
        <NavigationLink currentPath={pathname} href="/inventory" icon={<Boxes size={18} />}>
          Inventory
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
          href="/reports"
          icon={<ChartNoAxesColumnIncreasing size={18} />}
        >
          Reports
        </NavigationLink>
        <NavigationLink
          currentPath={pathname}
          href="/ads-promotions"
          icon={<Megaphone size={18} />}
        >
          Ads & Promotions
        </NavigationLink>
        <NavigationLink currentPath={pathname} href="/settings" icon={<Settings size={18} />}>
          Settings
        </NavigationLink>
      </nav>

      <div className="sidebar-session">
        <span className="sidebar-trust">
          <ShieldCheck size={14} aria-hidden="true" />
          Marketplace data stays read-only
        </span>
        <span>{session?.userEmail ?? "Session not loaded"}</span>
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
