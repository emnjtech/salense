import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StoreConnectionStatus } from "../../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { AiBriefingService } from "../ai-briefing.service.js";
import { BusinessHealthEngine } from "../engines/business-health.engine.js";
import { ConfidenceEngine } from "../engines/confidence.engine.js";
import { DiagnosticEngine } from "../engines/diagnostic.engine.js";
import { ExecutiveSummaryEngine } from "../engines/executive-summary.engine.js";
import { ExplainabilityEngine } from "../engines/explainability.engine.js";
import { ForecastingEngine } from "../engines/forecasting.engine.js";
import { ObservationEngine } from "../engines/observation.engine.js";
import { RecommendationEngine } from "../engines/recommendation.engine.js";

const business = { id: "business_1", name: "Ivonmelda Hair" } as const;

describe("AiBriefingService", () => {
  it("returns an insufficient-data response for an empty business", async () => {
    const { service } = createService();

    const response = await service.getTodayBriefing("user_1");

    expect(response).toMatchObject({
      status: "INSUFFICIENT_DATA",
      message: "Not enough synchronized commerce data is available to generate a reliable AI briefing.",
      observations: [],
      risks: [],
      opportunities: [],
      recommendations: [],
      forecasts: [],
      confidence: { level: "LOW", score: 0 },
    });
    expect(response.explainability?.safetyConstraints).toContain("No marketplace APIs are queried by the AI layer.");
  });

  it("generates observations from synchronized normalized commerce data", async () => {
    const { service } = createService({
      stores: [connectedStore()],
      orders: [
        order({ id: "order_today", orderedAt: new Date("2026-07-08T10:00:00.000Z"), totalAmount: "303.00" }),
        order({ id: "order_yesterday", orderedAt: new Date("2026-07-07T10:00:00.000Z"), totalAmount: "150.00" }),
      ],
      orderItems: [
        {
          name: "Crochet Bundle",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_product_1",
          quantity: 2,
          totalAmount: "303.00",
          order: { orderStatus: "processing" },
        },
      ],
      products: [product({ currentStockQuantity: 12, stockStatus: "instock" })],
      customers: [{ id: "customer_1", platform: StorePlatform.WooCommerce }],
    });

    const response = await service.getTodayBriefing("user_1");

    expect(response.status).toBe("READY");
    expect(response.businessOverview).toMatchObject({
      businessId: business.id,
      businessName: business.name,
      connectedStores: 1,
      revenueToday: 303,
      ordersToday: 1,
      productsTracked: 1,
      customersTracked: 1,
    });
    expect(response.observations.map((observation) => observation.id)).toContain(
      "observation-revenue-today",
    );
    expect(response.executiveSummary).toContain("Ivonmelda Hair has 1 orders");
  });

  it("creates inventory recommendations when synchronized products are at risk", async () => {
    const { service } = createService({
      stores: [connectedStore()],
      orders: [order()],
      orderItems: [
        {
          name: "Crochet Bundle",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_product_1",
          quantity: 1,
          totalAmount: "40.00",
          order: { orderStatus: "processing" },
        },
      ],
      products: [product({ currentStockQuantity: 2, stockStatus: "low_stock" })],
    });

    const response = await service.getTodayBriefing("user_1");

    expect(response.risks.map((risk) => risk.driver)).toContain("INVENTORY");
    expect(response.recommendations).toContainEqual(
      expect.objectContaining({
        actionType: "REVIEW_INVENTORY",
        title: "Review inventory availability",
      }),
    );
  });

  it("creates confidence and explainability objects", async () => {
    const { service } = createService({
      stores: [connectedStore()],
      orders: [order()],
      products: [product({ currentStockQuantity: 10, stockStatus: "instock" })],
    });

    const response = await service.getTodayBriefing("user_1");

    expect(response.confidence).toMatchObject({
      level: expect.any(String),
      score: expect.any(Number),
      factors: expect.arrayContaining([expect.stringContaining("synchronized")]),
    });
    expect(response.explainability).toMatchObject({
      rulesApplied: expect.arrayContaining([
        "Only revenue-eligible order statuses contribute to revenue.",
      ]),
      safetyConstraints: expect.arrayContaining([
        "No credentials, tokens, hashes, or encrypted secrets are selected.",
      ]),
    });
  });

  it("enforces business ownership through the authenticated owner id", async () => {
    const { prisma, service } = createService();

    await expect(service.getTodayBriefing("user_1")).resolves.toBeDefined();

    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { ownerId: "user_1" },
      select: { id: true, name: true },
    });
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.getTodayBriefing("user_without_business")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("does not expose raw payloads, credentials, tokens, hashes, or secrets", async () => {
    const { service } = createService({
      stores: [connectedStore()],
      orders: [order()],
      products: [product({ currentStockQuantity: 10, stockStatus: "instock" })],
    });

    const responseJson = JSON.stringify(await service.getTodayBriefing("user_1"));

    expect(responseJson).not.toContain("sourceMetadata");
    expect(responseJson).not.toContain("payload");
    expect(responseJson).not.toContain("tokenHash");
    expect(responseJson).not.toContain("accessToken");
    expect(responseJson).not.toContain("refreshToken");
    expect(responseJson).not.toContain("passwordHash");
    expect(responseJson).not.toContain("secret");
  });
});

function createService(input: {
  readonly businessRecord?: typeof business | null;
  readonly stores?: readonly unknown[];
  readonly orders?: readonly unknown[];
  readonly orderItems?: readonly unknown[];
  readonly products?: readonly unknown[];
  readonly customers?: readonly unknown[];
  readonly refunds?: readonly unknown[];
} = {}) {
  const prisma = {
    business: {
      findUnique: jest.fn().mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    connectedStore: {
      findMany: jest.fn().mockResolvedValue(input.stores ?? []),
    },
    commerceOrder: {
      findMany: jest.fn().mockResolvedValue(input.orders ?? []),
    },
    commerceOrderItem: {
      findMany: jest.fn().mockResolvedValue(input.orderItems ?? []),
    },
    commerceProduct: {
      findMany: jest.fn().mockResolvedValue(input.products ?? []),
    },
    commerceCustomer: {
      findMany: jest.fn().mockResolvedValue(input.customers ?? []),
    },
    commerceRefund: {
      findMany: jest.fn().mockResolvedValue(input.refunds ?? []),
    },
  };

  return {
    prisma,
    service: new AiBriefingService(
      { client: prisma } as unknown as PrismaService,
      new ObservationEngine(),
      new DiagnosticEngine(),
      new RecommendationEngine(),
      new ForecastingEngine(),
      new BusinessHealthEngine(),
      new ConfidenceEngine(),
      new ExplainabilityEngine(),
      new ExecutiveSummaryEngine(),
    ),
  };
}

function connectedStore() {
  return {
    id: "store_1",
    platform: StorePlatform.WooCommerce,
    storeName: "WooCommerce Store",
    lastSynchronisedAt: new Date("2026-07-08T09:00:00.000Z"),
    connectionStatus: StoreConnectionStatus.Connected,
    disconnectedAt: null,
  };
}

function order(overrides: Partial<ReturnType<typeof baseOrder>> = {}) {
  return {
    ...baseOrder(),
    ...overrides,
  };
}

function baseOrder() {
  return {
    id: "order_1",
    connectedStoreId: "store_1",
    platform: StorePlatform.WooCommerce,
    orderStatus: "processing",
    totalAmount: "40.00",
    orderedAt: new Date("2026-07-08T10:00:00.000Z"),
  };
}

function product(overrides: Partial<ReturnType<typeof baseProduct>> = {}) {
  return {
    ...baseProduct(),
    ...overrides,
  };
}

function baseProduct() {
  return {
    id: "product_1",
    platform: StorePlatform.WooCommerce,
    name: "Crochet Bundle",
    stockStatus: "instock",
    currentStockQuantity: 10,
  };
}
