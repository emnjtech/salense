import { BarChart3, CircleDollarSign, Megaphone, MousePointerClick, ShieldCheck } from "lucide-react";

const upcomingCapabilities = [
  {
    description: "Compare search advertising signals with commerce outcomes.",
    label: "Google Ads integration",
    status: "Coming soon",
  },
  {
    description: "Understand how social campaigns influence products and customers.",
    label: "Meta Ads integration",
    status: "Coming soon",
  },
  {
    description: "Bring TikTok advertising performance into the commerce picture.",
    label: "TikTok Ads integration",
    status: "Coming soon",
  },
  {
    description: "Review campaign performance beside revenue, orders, and product movement.",
    label: "Campaign performance",
    status: "Coming soon",
  },
  {
    description: "Identify promoted products that are not converting into sales.",
    label: "Product-level promotion return",
    status: "Coming soon",
  },
  {
    description: "Compare ad spend with revenue to support budget decisions.",
    label: "Ad spend versus revenue",
    status: "Coming soon",
  },
  {
    description: "Prepare customer acquisition cost analysis from connected marketing data.",
    label: "Customer acquisition cost",
    status: "Coming soon",
  },
] as const;

export function AdsPromotionsWorkspace() {
  return (
    <main className="workspace ads-promotions-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Planned intelligence</p>
          <h1>Ads & Promotions</h1>
          <p>Connect advertising platforms to understand how spend influences sales performance.</p>
        </div>
      </header>

      <section className="panel ads-promotions-hero">
        <div className="ads-promotions-icon">
          <Megaphone size={28} aria-hidden="true" />
        </div>
        <div>
          <h2>Advertising intelligence is planned for a future release.</h2>
          <p>
            Soon, Salense will help you compare advertising performance with commerce results so
            you can see which products, channels, and campaigns deserve more budget and which ones
            need reducing.
          </p>
        </div>
      </section>

      <section className="ads-promotions-grid" aria-label="Planned Ads and Promotions features">
        {upcomingCapabilities.map((capability) => (
          <article className="panel ads-promotions-card" key={capability.label}>
            <div>
              <span className="coming-soon-pill">{capability.status}</span>
              <h2>{capability.label}</h2>
              <p>{capability.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="panel ads-promotions-proof">
        <div>
          <ShieldCheck size={20} aria-hidden="true" />
          <strong>Read-only first</strong>
          <span>Advertising intelligence will begin with analysis, not campaign changes.</span>
        </div>
        <div>
          <BarChart3 size={20} aria-hidden="true" />
          <strong>Commerce context</strong>
          <span>Spend will be evaluated beside revenue, orders, products, and customers.</span>
        </div>
        <div>
          <CircleDollarSign size={20} aria-hidden="true" />
          <strong>Budget clarity</strong>
          <span>Recommendations will explain where budget needs increasing, reducing, or monitoring.</span>
        </div>
        <div>
          <MousePointerClick size={20} aria-hidden="true" />
          <strong>No campaign management</strong>
          <span>Google Ads and Meta Ads credentials are not required for this placeholder.</span>
        </div>
      </section>
    </main>
  );
}
