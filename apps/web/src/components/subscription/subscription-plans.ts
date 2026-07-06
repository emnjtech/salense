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
    bestFor: "Ideal for small businesses beginning multi-channel selling.",
    connectedStoreLimit: "2",
    description: "A focused workspace for daily commerce visibility.",
    features: [
      "Today dashboard",
      "Orders, products, customers, and inventory intelligence",
      "Store connection status",
      "Platform performance reporting",
    ],
    monthlyPrice: "\u00a320",
    name: "Starter",
    plan: SubscriptionPlan.Starter,
    teamMemberLimit: "1",
  },
  {
    bestFor: "Designed for growing businesses managing multiple sales channels.",
    connectedStoreLimit: "4",
    description: "More room for multi-platform operations and weekly performance review.",
    features: [
      "Everything in Starter",
      "Business Health Score",
      "Reports workspace",
      "Inventory attention signals",
    ],
    monthlyPrice: "\u00a335",
    name: "Business",
    plan: SubscriptionPlan.Professional,
    teamMemberLimit: "3",
  },
  {
    bestFor:
      "For established businesses requiring advanced commerce intelligence across larger operations.",
    connectedStoreLimit: "8",
    description: "A broader operating view for larger catalogues and store portfolios.",
    features: [
      "Everything in Business",
      "Expanded store coverage",
      "Priority onboarding",
      "Workspace readiness review",
    ],
    monthlyPrice: "\u00a370",
    name: "Enterprise",
    plan: SubscriptionPlan.Business,
    teamMemberLimit: "8",
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

  const businessPlan = pricingPlans.find(
    (pricingPlan) => pricingPlan.plan === SubscriptionPlan.Professional,
  );

  if (!businessPlan) {
    throw new Error("Business subscription plan is not configured.");
  }

  return businessPlan;
}
