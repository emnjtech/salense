const revenueEligibleStatuses = new Set([
  "completed",
  "delivered",
  "paid",
  "processing",
  "shipped",
]);

const nonRevenueStatuses = new Set([
  "cancelled",
  "failed",
  "on_hold",
  "payment_failed",
  "pending",
  "refunded",
]);

export function isRevenueEligibleOrderStatus(status: string | null | undefined): boolean {
  const normalizedStatus = normalizeOrderStatus(status);

  if (!normalizedStatus) {
    return false;
  }

  if (nonRevenueStatuses.has(normalizedStatus)) {
    return false;
  }

  return revenueEligibleStatuses.has(normalizedStatus);
}

export function normalizeOrderStatus(status: string | null | undefined): string | null {
  const normalizedStatus = status
    ?.trim()
    .toLowerCase()
    .replace(/^wc-/, "")
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  return normalizedStatus && normalizedStatus.length > 0 ? normalizedStatus : null;
}
