import { Database, ShieldCheck, Store } from "lucide-react";

export function DemoModeBanner() {
  return (
    <section className="demo-mode-banner" aria-label="MVP demo mode">
      <div className="demo-mode-icon">
        <Database size={18} aria-hidden="true" />
      </div>
      <div>
        <strong>Demo workspace: Northstar Home Goods</strong>
        <span>
          Seeded four-platform commerce data designed to show business health, platform comparison,
          customers, and inventory risk in under a minute.
        </span>
      </div>
      <div className="demo-mode-pill">
        <ShieldCheck size={14} aria-hidden="true" />
        Read-only MVP
      </div>
      <div className="demo-mode-pill secondary">
        <Store size={14} aria-hidden="true" />
        demo@salense.local
      </div>
    </section>
  );
}
