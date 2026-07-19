import {
  ArrowDown,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Globe2,
  Instagram,
  Linkedin,
  MousePointerClick,
  Music2,
  PlaySquare,
  Share2,
  TrendingUp,
} from "lucide-react";

const previewLabels = [
  "Audience growth",
  "Engagement changes",
  "Channel performance",
  "Content opportunities",
  "Marketing risks",
  "Recommended actions",
] as const;

const socialPlatforms = [
  {
    description: "Compare audience growth, reach, engagement, and content performance.",
    icon: <Instagram size={20} aria-hidden="true" />,
    name: "Instagram",
  },
  {
    description: "Understand page engagement, referral traffic, and campaign response.",
    icon: <Share2 size={20} aria-hidden="true" />,
    name: "Facebook",
  },
  {
    description: "Track short-form video performance and social commerce momentum.",
    icon: <Music2 size={20} aria-hidden="true" />,
    name: "TikTok",
  },
  {
    description: "Review video reach, watch signals, and audience growth patterns.",
    icon: <PlaySquare size={20} aria-hidden="true" />,
    name: "YouTube",
  },
  {
    description: "Assess professional audience growth and B2B content engagement.",
    icon: <Linkedin size={20} aria-hidden="true" />,
    name: "LinkedIn",
  },
  {
    description: "Monitor public conversation, reach, and audience response.",
    icon: <Globe2 size={20} aria-hidden="true" />,
    name: "X",
  },
  {
    description: "Measure discovery, saves, outbound clicks, and visual content intent.",
    icon: <MousePointerClick size={20} aria-hidden="true" />,
    name: "Pinterest",
  },
] as const;

const performanceCards = [
  "Total Audience",
  "Audience Growth",
  "Engagement Rate",
  "Reach",
  "Impressions",
  "Website Clicks",
  "Best Performing Platform",
  "Top Performing Content",
] as const;

const intelligenceExamples = [
  "TikTok generated the strongest audience growth this week.",
  "Instagram produced more website visits.",
  "Facebook engagement declined and may require new creative.",
  "Short-form video outperformed static content.",
  "Increased engagement has not yet translated into higher sales.",
] as const;

const recommendationCards = [
  {
    body: "Short-form video is generating the strongest engagement. Consider increasing the publishing frequency while improving product calls-to-action.",
    title: "Content strategy",
  },
  {
    body: "Identify channels where follower growth is rising but website clicks remain low.",
    title: "Audience growth",
  },
  {
    body: "Prioritise channels that combine strong reach with measurable commerce intent.",
    title: "Channel prioritisation",
  },
  {
    body: "Compare campaign engagement with product movement before increasing spend.",
    title: "Campaign effectiveness",
  },
  {
    body: "Review landing pages where social traffic is high but product conversion is weak.",
    title: "Website conversion",
  },
  {
    body: "Evaluate marketing return beside revenue, orders, and inventory availability.",
    title: "Marketing return on investment",
  },
] as const;

const commerceFlow = [
  "Social Media",
  "Audience and Engagement",
  "Website Traffic",
  "Commerce Revenue",
  "AI Recommendations",
] as const;

export function MarketingIntelligenceWorkspace() {
  return (
    <main className="workspace marketing-intelligence-workspace">
      <header className="workspace-header marketing-intelligence-header">
        <div>
          <p className="eyebrow">Expansion module</p>
          <div className="marketing-title-row">
            <h1>Marketing Intelligence</h1>
            <ComingSoonBadge />
          </div>
          <p>
            Understand how your social media channels are performing, why engagement is changing,
            and what actions may improve marketing outcomes.
          </p>
          <p className="marketing-header-support">
            Marketing Intelligence will bring your connected social media platforms into one
            AI-powered workspace, helping you compare performance, identify opportunities and
            receive actionable recommendations.
          </p>
        </div>
      </header>

      <section className="marketing-hero-grid">
        <article className="panel marketing-health-card">
          <div className="marketing-card-heading">
            <span className="marketing-card-icon">
              <BarChart3 size={22} aria-hidden="true" />
            </span>
            <ComingSoonBadge />
          </div>
          <h2>Marketing Health</h2>
          <p>
            Marketing Health will become available after at least one social media account is
            connected.
          </p>
        </article>

        <article className="panel marketing-briefing-card">
          <div className="marketing-card-heading">
            <span className="marketing-card-icon">
              <BrainCircuit size={22} aria-hidden="true" />
            </span>
            <PreviewBadge />
          </div>
          <h2>AI Marketing Briefing</h2>
          <p>
            Once your social media accounts are connected, Salense will explain what changed, why
            it matters, which channels need attention, and what action should be prioritised.
          </p>
          <div className="marketing-preview-labels" aria-label="Preview insight labels">
            {previewLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <p className="marketing-preview-note">
            Preview only — live insights will become available when Marketing Intelligence
            integrations are released.
          </p>
        </article>
      </section>

      <section className="marketing-section" aria-labelledby="connected-social-platforms">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Connected platforms</p>
            <h2 id="connected-social-platforms">Social media platforms</h2>
          </div>
          <ComingSoonBadge />
        </div>
        <div className="marketing-platform-grid">
          {socialPlatforms.map((platform) => (
            <article className="panel marketing-platform-card" key={platform.name}>
              <div className="marketing-platform-icon">{platform.icon}</div>
              <div>
                <h3>{platform.name}</h3>
                <span className="marketing-status">Status: Coming Soon</span>
                <p>{platform.description}</p>
              </div>
              <button className="secondary-button marketing-disabled-button" disabled type="button">
                Connect — Coming Soon
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section" aria-labelledby="social-performance-preview">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Performance preview</p>
            <h2 id="social-performance-preview">Social Media Performance Preview</h2>
          </div>
          <PreviewBadge />
        </div>
        <div className="marketing-performance-grid">
          {performanceCards.map((label) => (
            <PreviewMetricCard key={label} label={label} />
          ))}
        </div>
      </section>

      <section className="panel marketing-intelligence-panel">
        <div className="marketing-panel-copy">
          <p className="eyebrow">Illustrative preview</p>
          <h2>Cross-Platform Intelligence</h2>
          <p>
            Salense will compare social media channels in one place, helping businesses understand
            which platforms generate engagement, website traffic and commercial value.
          </p>
        </div>
        <div className="marketing-example-list">
          {intelligenceExamples.map((example) => (
            <div key={example}>
              <PreviewBadge />
              <span>{example}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section" aria-labelledby="future-ai-recommendations">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Planned action layer</p>
            <h2 id="future-ai-recommendations">Future AI Recommendations</h2>
          </div>
          <PreviewBadge />
        </div>
        <div className="marketing-recommendation-grid">
          {recommendationCards.map((card) => (
            <article className="panel marketing-recommendation-card" key={card.title}>
              <PreviewBadge />
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel marketing-commerce-card">
        <div>
          <p className="eyebrow">Strategic direction</p>
          <h2>Connect Marketing Performance to Commerce Results</h2>
          <p>
            Future Marketing Intelligence will combine social media engagement with commerce data
            to help businesses understand which content, channels and campaigns contribute to
            website traffic, product interest and revenue.
          </p>
        </div>
        <div className="marketing-flow" aria-label="Marketing to commerce intelligence flow">
          {commerceFlow.map((step, index) => (
            <div className="marketing-flow-step" key={step}>
              <span>{step}</span>
              {index < commerceFlow.length - 1 ? <ArrowDown size={16} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ComingSoonBadge() {
  return <span className="marketing-badge coming-soon">Coming Soon</span>;
}

function PreviewBadge() {
  return <span className="marketing-badge preview">Preview</span>;
}

function PreviewMetricCard({ label }: { readonly label: string }) {
  return (
    <article className="panel marketing-metric-card">
      <div className="marketing-card-heading">
        <span className="marketing-card-icon subtle">
          <TrendingUp size={18} aria-hidden="true" />
        </span>
        <ComingSoonBadge />
      </div>
      <h3>{label}</h3>
      <p>Available after connecting your social media accounts.</p>
      <span className="marketing-empty-line">
        <CheckCircle2 size={14} aria-hidden="true" />
        No live social account connected
      </span>
    </article>
  );
}
