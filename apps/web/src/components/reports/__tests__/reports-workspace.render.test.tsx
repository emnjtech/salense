import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StorePlatform } from "../../../lib/api/store-integrations-client";
import { ReportsOverviewView } from "../reports-workspace";

describe("ReportsOverviewView", () => {
  it("renders KPI cards, charts, tables, and inventory summary", () => {
    const html = renderToStaticMarkup(
      createElement(ReportsOverviewView, {
        overview: {
          filters: {
            dateFrom: "2026-07-01T00:00:00.000Z",
            dateTo: "2026-07-05T23:59:59.999Z",
            platform: null,
            store: null,
          },
          inventory: { inventoryRisk: 2, inventoryValue: 1500, lowStock: 2, outOfStock: 0 },
          kpis: {
            averageOrderValue: 120,
            businessHealthScore: 82,
            orders: 3,
            refunds: 1,
            revenue: 360,
          },
          ordersByPlatform: [{ platform: StorePlatform.Shopify, value: 3 }],
          ordersTrend: [
            {
              averageOrderValue: 120,
              bestPlatform: { platform: StorePlatform.Shopify, value: 360 },
              date: "2026-07-01",
              orders: 3,
              revenue: 360,
              topProduct: { productName: "Brass Desk Lamp", revenue: 360, unitsSold: 3 },
              value: 3,
            },
          ],
          revenueByPlatform: [{ platform: StorePlatform.Shopify, value: 360 }],
          revenueTrend: [
            {
              averageOrderValue: 120,
              bestPlatform: { platform: StorePlatform.Shopify, value: 360 },
              date: "2026-07-01",
              orders: 3,
              revenue: 360,
              topProduct: { productName: "Brass Desk Lamp", revenue: 360, unitsSold: 3 },
              value: 360,
            },
          ],
          stores: [],
          topCustomers: [
            {
              averageOrderValue: 360,
              customerId: "customer_1",
              customerName: "Ada Lovelace",
              lifetimeSpend: 360,
              orders: 1,
            },
          ],
          topProducts: [
            {
              inventory: 8,
              platform: StorePlatform.Shopify,
              productId: "product_1",
              productName: "Brass Desk Lamp",
              revenue: 360,
              sku: "LAMP-1",
              unitsSold: 3,
            },
          ],
        },
      }),
    );

    expect(html).toContain("Revenue Trend");
    expect(html).toContain("Orders by Platform");
    expect(html).toContain("Top Products");
    expect(html).toContain("Top Customers");
    expect(html).toContain("Inventory Risk");
    expect(html).toContain("Average order value");
    expect(html).toContain("Best platform");
    expect(html).toContain("/platforms/SHOPIFY");
    expect(html).toContain("Brass Desk Lamp");
    expect(html).toContain("Ada Lovelace");
  });
});
