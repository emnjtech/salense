import { Bell, Building2, LockKeyhole, PlugZap, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const settingsSections = [
  {
    description: "Manage your name, email address, password access, and workspace preferences.",
    href: null,
    icon: <UserCircle size={20} aria-hidden="true" />,
    label: "Account",
    status: "Account controls",
  },
  {
    description:
      "Keep company details, trading profile, currency, location, and tax preferences aligned.",
    href: "/company-profile",
    icon: <Building2 size={20} aria-hidden="true" />,
    label: "Business profile",
    status: "Open profile",
  },
  {
    description:
      "Review sign-in protection, password policies, session handling, and access safeguards.",
    href: null,
    icon: <LockKeyhole size={20} aria-hidden="true" />,
    label: "Security",
    status: "Security settings",
  },
  {
    description:
      "Review connected commerce platforms, synchronisation status, and read-only store access.",
    href: "/store-integrations",
    icon: <PlugZap size={20} aria-hidden="true" />,
    label: "Store connections",
    status: "Manage stores",
  },
  {
    description:
      "Choose which workspace events should require attention as Salense expands notification controls.",
    href: null,
    icon: <Bell size={20} aria-hidden="true" />,
    label: "Notifications",
    status: "Coming soon",
  },
  {
    description:
      "Understand data retention, privacy controls, source integrity, and read-only commerce records.",
    href: null,
    icon: <ShieldCheck size={20} aria-hidden="true" />,
    label: "Data & privacy",
    status: "Workspace policy",
  },
] as const;

export function SettingsWorkspace() {
  return (
    <main className="workspace settings-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1>Settings</h1>
          <p>
            Manage the Salense workspace, account preferences, business profile, store connections,
            security posture, notifications, and data privacy settings.
          </p>
        </div>
      </header>

      <section className="settings-hero panel" aria-labelledby="settings-overview-title">
        <div>
          <span className="settings-hero-icon">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <p className="eyebrow">Workspace control</p>
          <h2 id="settings-overview-title">Your commerce intelligence workspace settings</h2>
          <p>
            These settings help keep Northstar Home Goods organised while Salense preserves platform
            identity, business ownership, and read-only commerce intelligence.
          </p>
        </div>
      </section>

      <section className="settings-grid" aria-label="Settings sections">
        {settingsSections.map((section) => (
          <SettingsSectionCard key={section.label} {...section} />
        ))}
      </section>
    </main>
  );
}

function SettingsSectionCard({
  description,
  href,
  icon,
  label,
  status,
}: {
  readonly description: string;
  readonly href: string | null;
  readonly icon: ReactNode;
  readonly label: string;
  readonly status: string;
}) {
  const content = (
    <>
      <span className="settings-card-icon">{icon}</span>
      <span className="settings-card-status">{status}</span>
      <h2>{label}</h2>
      <p>{description}</p>
    </>
  );

  if (href) {
    return (
      <Link className="panel settings-card clickable-card" href={href}>
        {content}
      </Link>
    );
  }

  return <article className="panel settings-card">{content}</article>;
}
