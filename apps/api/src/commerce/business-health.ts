export type BusinessHealthContributorStatus = "GOOD" | "AT_RISK" | "NEEDS_DATA";

export interface BusinessHealthCalculationInput {
  readonly connectedPlatforms: number;
  readonly lowStockProducts: number;
  readonly outOfStockProducts: number;
  readonly refundsToday: number;
  readonly revenueLast7Days: number;
  readonly revenueToday: number;
}

export interface BusinessHealthCalculationContributor {
  readonly name: string;
  readonly status: BusinessHealthContributorStatus;
  readonly summary: string;
}

export interface BusinessHealthCalculation {
  readonly contributors: readonly BusinessHealthCalculationContributor[];
  readonly score: number | null;
  readonly status: "GOOD" | "AT_RISK" | "INSUFFICIENT_DATA";
  readonly summary: string;
}

export function calculateSharedBusinessHealth(
  input: BusinessHealthCalculationInput,
): BusinessHealthCalculation {
  const hasSynchronizedRevenue = input.revenueToday > 0 || input.revenueLast7Days > 0;

  if (!hasSynchronizedRevenue && input.connectedPlatforms === 0) {
    return {
      contributors: [],
      score: null,
      status: "INSUFFICIENT_DATA",
      summary:
        "Business Health Score will become available after your first successful synchronization.",
    };
  }

  const contributors = [
    {
      name: "Sales",
      status: hasSynchronizedRevenue ? "GOOD" : "NEEDS_DATA",
      summary:
        input.revenueToday > 0
          ? "Revenue is visible today."
          : "Recent synchronized revenue is limited.",
    },
    {
      name: "Channel coverage",
      status: input.connectedPlatforms > 1 ? "GOOD" : "AT_RISK",
      summary:
        input.connectedPlatforms > 1
          ? "Multiple connected platforms support comparison."
          : "Current intelligence depends on one connected platform.",
    },
    {
      name: "Inventory",
      status: input.outOfStockProducts > 0 || input.lowStockProducts > 0 ? "AT_RISK" : "GOOD",
      summary:
        input.outOfStockProducts > 0 || input.lowStockProducts > 0
          ? "Inventory risk is present in synchronized product data."
          : "No low-stock or out-of-stock products are visible.",
    },
    {
      name: "Refund activity",
      status: input.refundsToday > 0 ? "AT_RISK" : "GOOD",
      summary:
        input.refundsToday > 0 ? "Refund activity is present today." : "Refund activity is low today.",
    },
  ] as const;

  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        contributors.filter((contributor) => contributor.status === "AT_RISK").length * 12 -
        contributors.filter((contributor) => contributor.status === "NEEDS_DATA").length * 18,
    ),
  );

  return {
    contributors,
    score,
    status: score >= 75 ? "GOOD" : "AT_RISK",
    summary: `Business health is ${score >= 75 ? "good" : "at risk"} based on synchronized commerce data.`,
  };
}
