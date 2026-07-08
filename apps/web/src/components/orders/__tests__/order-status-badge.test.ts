import { formatOrderStatus, isRevenueEligibleOrderStatus } from "../order-status-badge";

describe("order status presentation", () => {
  it("formats marketplace statuses for display", () => {
    expect(formatOrderStatus("payment_failed")).toBe("Payment Failed");
    expect(formatOrderStatus("wc-on-hold")).toBe("On Hold");
    expect(formatOrderStatus(null)).toBe("Unknown");
  });

  it("matches the revenue eligibility rules used by sales metrics", () => {
    expect(isRevenueEligibleOrderStatus("completed")).toBe(true);
    expect(isRevenueEligibleOrderStatus("processing")).toBe(true);
    expect(isRevenueEligibleOrderStatus("shipped")).toBe(true);
    expect(isRevenueEligibleOrderStatus("failed")).toBe(false);
    expect(isRevenueEligibleOrderStatus("pending")).toBe(false);
    expect(isRevenueEligibleOrderStatus("cancelled")).toBe(false);
    expect(isRevenueEligibleOrderStatus("refunded")).toBe(false);
  });
});
