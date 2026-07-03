import { Database, Store } from "lucide-react";

export function DemoModeBanner() {
  return (
    <section className="demo-mode-banner" aria-label="MVP demo mode">
      <div className="demo-mode-icon">
        <Database size={18} aria-hidden="true" />
      </div>
      <div>
        <strong>Demo workspace: Northstar Home Goods</strong>
        <span>
          Seeded WooCommerce, Amazon Seller, and TikTok Shop data for Today, Orders, and Products.
        </span>
      </div>
      <div className="demo-mode-pill">
        <Store size={14} aria-hidden="true" />
        demo@salense.local
      </div>
    </section>
  );
}
