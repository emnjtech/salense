import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const supportedPlatforms = [
  {
    description: "Connect Shopify stores for a clear view of sales, customers and stock.",
    icon: "/platforms/shopify.svg",
    name: "Shopify",
  },
  {
    description: "Sync WooCommerce commerce data while preserving store and product identity.",
    icon: "/platforms/woocommerce.svg",
    name: "WooCommerce",
  },
  {
    description: "Understand Amazon Seller performance alongside your other channels.",
    icon: "/platforms/amazon-seller.svg",
    name: "Amazon Seller",
  },
  {
    description: "Track TikTok Shop activity in the same intelligence workspace.",
    icon: "/platforms/tiktok-shop.svg",
    name: "TikTok Shop",
  },
];

const capabilities = ["Read-only sync", "Orders", "Products", "Customers", "Inventory", "Reports"];
const plannedPlatforms = ["Etsy", "eBay", "Temu", "Walmart Marketplace", "Square", "BigCommerce"];

export function IntegrationsPage() {
  return (
    <main className="public-page public-content-page">
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="Salense home">
          <Image alt="Salense" height={44} priority src="/brand/salense-logo-dark.svg" width={142} />
        </Link>
        <div className="public-nav-actions">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link className="primary-button" href="/login">
            Login
          </Link>
        </div>
      </header>

      <section className="public-story-hero">
        <p className="eyebrow">Integrations</p>
        <h1>Connect the commerce platforms your business already uses.</h1>
        <p>
          Salense brings supported sales channels into one intelligence workspace while preserving
          platform identity, store ownership and read-only source integrity.
        </p>
        <div className="public-story-actions">
          <Link className="primary-button" href="/pricing">
            Request invitation
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="secondary-button" href="/about">
            Learn about Salense
          </Link>
        </div>
      </section>

      <section className="integration-grid" aria-label="Supported commerce integrations">
        {supportedPlatforms.map((platform) => (
          <article className="panel integration-card" key={platform.name}>
            <div className="integration-card-heading">
              <Image alt="" height={34} src={platform.icon} width={34} />
              <div>
                <h2>{platform.name}</h2>
                <p>{platform.description}</p>
              </div>
            </div>
            <ul>
              {capabilities.map((capability) => (
                <li key={capability}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="panel planned-integrations">
        <div>
          <p className="eyebrow">Planned integrations</p>
          <h2>More commerce channels are planned.</h2>
          <p>
            These platforms are on the roadmap and are not currently active in Salense connections.
          </p>
        </div>
        <ul>
          {plannedPlatforms.map((platform) => (
            <li key={platform}>
              <Clock3 size={15} aria-hidden="true" />
              <span>{platform}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
