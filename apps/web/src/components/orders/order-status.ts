export function isRevenueEligibleOrderStatus(status: string | null | undefined): boolean {
  const normalizedStatus = normalizeOrderStatus(status);

  return (
    normalizedStatus === "completed" ||
    normalizedStatus === "delivered" ||
    normalizedStatus === "paid" ||
    normalizedStatus === "processing" ||
    normalizedStatus === "shipped"
  );
}

export function formatOrderStatus(status: string | null | undefined): string {
  const normalizedStatus = normalizeOrderStatus(status);

  if (!normalizedStatus) {
    return "Unknown";
  }

  return normalizedStatus
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function getOrderStatusClassName(status: string | null | undefined): string {
  const normalizedStatus = normalizeOrderStatus(status);

  switch (normalizedStatus) {
    case "completed":
      return "order-status--completed";
    case "processing":
      return "order-status--processing";
    case "delivered":
    case "shipped":
      return "order-status--fulfilled";
    case "paid":
      return "order-status--paid";
    case "pending":
    case "on_hold":
      return "order-status--pending";
    case "cancelled":
    case "failed":
    case "payment_failed":
      return "order-status--failed";
    case "refunded":
      return "order-status--refunded";
    default:
      return "order-status--unknown";
  }
}

function normalizeOrderStatus(status: string | null | undefined): string | null {
  const normalizedStatus = status
    ?.trim()
    .toLowerCase()
    .replace(/^wc-/, "")
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  return normalizedStatus && normalizedStatus.length > 0 ? normalizedStatus : null;
}
