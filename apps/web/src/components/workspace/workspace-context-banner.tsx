"use client";

import { ShieldCheck, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { readDemoSession } from "../../lib/auth-session";

export function WorkspaceContextBanner() {
  const [businessName, setBusinessName] = useState("Your business");

  useEffect(() => {
    setBusinessName(readDemoSession()?.businessName ?? "Your business");
  }, []);

  return (
    <section className="workspace-context-banner" aria-label="Workspace context">
      <div className="workspace-context-icon">
        <Store size={18} aria-hidden="true" />
      </div>
      <div>
        <strong>{businessName}</strong>
        <span>
          Commerce intelligence across connected sales channels once your first store is synced.
        </span>
      </div>
      <div className="workspace-context-pill">
        <ShieldCheck size={14} aria-hidden="true" />
        Read-only
      </div>
      <div className="workspace-context-pill secondary">
        <Store size={14} aria-hidden="true" />
        Store connections
      </div>
    </section>
  );
}
