import { ShieldCheck, Store } from "lucide-react";

export function WorkspaceContextBanner() {
  return (
    <section className="workspace-context-banner" aria-label="Workspace context">
      <div className="workspace-context-icon">
        <Store size={18} aria-hidden="true" />
      </div>
      <div>
        <strong>Northstar Home Goods</strong>
        <span>
          Read-only commerce intelligence across WooCommerce, Amazon Seller, Shopify, and TikTok
          Shop.
        </span>
      </div>
      <div className="workspace-context-pill">
        <ShieldCheck size={14} aria-hidden="true" />
        Read-only
      </div>
      <div className="workspace-context-pill secondary">
        <Store size={14} aria-hidden="true" />4 platforms
      </div>
    </section>
  );
}
