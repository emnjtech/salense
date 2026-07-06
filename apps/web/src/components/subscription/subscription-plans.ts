export enum SubscriptionPlan {
  Starter = "STARTER",
  Professional = "PROFESSIONAL",
  Business = "BUSINESS",
}

export enum SubscriptionPlatform {
  Shopify = "SHOPIFY",
  WooCommerce = "WOOCOMMERCE",
  AmazonSeller = "AMAZON_SELLER",
  TikTokShop = "TIKTOK_SHOP",
}

export interface PricingPlan {
  readonly bestFor: string;
  readonly connectedStoreLimit: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly monthlyPrice: string;
  readonly name: string;
  readonly plan: SubscriptionPlan;
  readonly teamMemberLimit: string;
}

export const pricingPlans: readonly PricingPlan[] = [
  {
    bestFor: "Founder-led stores getting their first reliable cross-channel view.",
    connectedStoreLimit: "2 connected stores",
    description: "A focused workspace for daily commerce visibility.",
    features: [
      "Today dashboard",
      "Orders, products, customers, and inventory intelligence",
      "Store connection status",
      "Platform performance reporting",
    ],
    monthlyPrice: "£49",
    name: "Starter",
    plan: SubscriptionPlan.Starter,
    teamMemberLimit: "1 team member",
  },
  {
    bestFor: "Growing operators selling through several commerce channels.",
    connectedStoreLimit: "6 connected stores",
    description: "More room for multi-platform operations and weekly performance review.",
    features: [
      "Everything in Starter",
      "Business Health Score",
      "Reports workspace",
      "Inventory attention signals",
    ],
    monthlyPrice: "£129",
    name: "Professional",
    plan: SubscriptionPlan.Professional,
    teamMemberLimit: "3 team members",
  },
  {
    bestFor: "Established businesses that need senior-level commerce oversight.",
    connectedStoreLimit: "15 connected stores",
    description: "A broader operating view for larger catalogues and store portfolios.",
    features: [
      "Everything in Professional",
      "Expanded store coverage",
      "Priority onboarding",
      "Workspace readiness review",
    ],
    monthlyPrice: "£249",
    name: "Business",
    plan: SubscriptionPlan.Business,
    teamMemberLimit: "8 team members",
  },
] as const;

export const subscriptionPlatforms = [
  { label: "Shopify", value: SubscriptionPlatform.Shopify },
  { label: "WooCommerce", value: SubscriptionPlatform.WooCommerce },
  { label: "Amazon Seller", value: SubscriptionPlatform.AmazonSeller },
  { label: "TikTok Shop", value: SubscriptionPlatform.TikTokShop },
] as const;

export function getPlanByValue(plan: string | undefined): PricingPlan {
  const matchedPlan = pricingPlans.find((pricingPlan) => pricingPlan.plan === plan);

  if (matchedPlan) {
    return matchedPlan;
  }

  const professionalPlan = pricingPlans.find(
    (pricingPlan) => pricingPlan.plan === SubscriptionPlan.Professional,
  );

  if (!professionalPlan) {
    throw new Error("Professional subscription plan is not configured.");
  }

  return professionalPlan;
}
