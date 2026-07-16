import Image from "next/image";
import Link from "next/link";

const effectiveDate = "16 July 2026";

const policySections = [
  {
    title: "Information we collect",
    body: [
      "When a business requests access to Salense, we collect contact and business details such as name, business name, work email, phone number, website, preferred plan, platforms used and any message submitted.",
      "When a user creates an account, we collect account information such as name, email address, password hash, business profile details and security information needed to operate the workspace.",
      "When a store is connected, Salense stores encrypted access credentials or authorization tokens and synchronizes commerce data needed to provide orders, products, customers, inventory, reports and business intelligence.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use information to provide the Salense workspace, process invitation requests, authenticate users, connect commerce platforms, synchronize store data, generate reports and present business intelligence to authorized users.",
      "Salense uses synchronized commerce data to calculate deterministic analytics, business health signals and AI-assisted narrative summaries. The AI layer uses normalized Salense data and does not access marketplace APIs directly.",
    ],
  },
  {
    title: "Commerce platform data",
    body: [
      "Salense is designed as read-only commerce intelligence. We do not create, update, delete, fulfil, ship, cancel, publish or otherwise modify marketplace records.",
      "Marketplace platforms remain the source of truth. Salense preserves platform identity and does not automatically merge products across different commerce platforms.",
    ],
  },
  {
    title: "Data sharing",
    body: [
      "We do not sell customer or commerce data.",
      "We may use trusted infrastructure and service providers to operate Salense, including hosting, database, email, analytics, error monitoring and AI infrastructure where configured. These providers process data only to support Salense operations.",
      "We may disclose information if required by law, regulation, legal process or to protect the security and integrity of Salense.",
    ],
  },
  {
    title: "Security",
    body: [
      "Salense stores passwords as hashes and stores marketplace credentials or tokens using encrypted credential storage.",
      "Access to business data is scoped to the authenticated business workspace. Platform administration and customer business administration are separate security domains.",
      "No internet service can be guaranteed to be completely secure, but we use reasonable technical and organizational measures to protect data handled by Salense.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "We retain account, business and commerce data for as long as needed to provide Salense, comply with legal obligations, resolve disputes and maintain platform security.",
      "When a store is disconnected, Salense stops using that connection for synchronization. Some historical normalized data may remain in the workspace unless deletion is requested or configured.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You may request access to, correction of, or deletion of personal information associated with your Salense account, subject to legal and operational requirements.",
      "You can disconnect commerce platforms from the Store Integrations workspace. You may also contact Salense to request account or business workspace deletion.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions or requests, contact Salense at hello@getsalense.com.",
      "If this policy changes materially, we will update the effective date and provide appropriate notice where required.",
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <main className="public-page public-content-page privacy-page">
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="Salense home">
          <Image alt="Salense" height={44} priority src="/brand/salense-logo-dark.svg" width={142} />
        </Link>
        <div className="public-nav-actions">
          <Link href="/integrations">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link className="primary-button" href="/login">
            Login
          </Link>
        </div>
      </header>

      <section className="public-story-hero privacy-hero">
        <p className="eyebrow">Privacy Policy</p>
        <h1>How Salense handles business and commerce data.</h1>
        <p>
          This Privacy Policy explains how Salense collects, uses and protects information when
          businesses request access, create accounts and connect commerce platforms.
        </p>
        <span>Effective date: {effectiveDate}</span>
      </section>

      <section className="panel privacy-policy-panel" aria-label="Privacy policy details">
        {policySections.map((section) => (
          <article className="privacy-policy-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
