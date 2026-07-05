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
          Seeded WooCommerce, Amazon Seller, TikTok Shop, and Shopify data for Today, Orders,
          Products, Customers, and Inventory.
        </span>
      </div>
      <div className="demo-mode-pill">
        <Store size={14} aria-hidden="true" />
        demo@salense.local
      </div>
    </section>
  );
}
