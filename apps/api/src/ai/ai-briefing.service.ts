import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { StoreConnectionStatus } from "../store-integrations/types/store-connection-status.enum.js";
import { BusinessHealthEngine } from "./engines/business-health.engine.js";
import { ConfidenceEngine } from "./engines/confidence.engine.js";
import { DiagnosticEngine } from "./engines/diagnostic.engine.js";
import { ExecutiveSummaryEngine } from "./engines/executive-summary.engine.js";
import { ExplainabilityEngine } from "./engines/explainability.engine.js";
import { ForecastingEngine } from "./engines/forecasting.engine.js";
import { buildAiMetrics, hasSufficientAiData } from "./engines/metrics.js";
import { ObservationEngine } from "./engines/observation.engine.js";
import { RecommendationEngine } from "./engines/recommendation.engine.js";
import type { AiBriefingTodayResponse } from "./types/ai-objects.type.js";
import type {
  AiBusinessRecord,
  AiConnectedStoreRecord,
  AiCustomerRecord,
  AiOrderItemRecord,
  AiOrderRecord,
  AiProductRecord,
  AiRefundRecord,
  AiSourceData,
} from "./types/ai-source-data.type.js";

const insufficientDataMessage =
  "Not enough synchronized commerce data is available to generate a reliable AI briefing.";

interface AiBriefingPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true; readonly name: true };
    }): Promise<AiBusinessRecord | null>;
  };
  readonly connectedStore: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectionStatus: StoreConnectionStatus.Connected;
        readonly disconnectedAt: null;
      };
      readonly select: {
        readonly id: true;
        readonly platform: true;
        readonly storeName: true;
        readonly lastSynchronisedAt: true;
      };
      readonly orderBy: { readonly storeName: "asc" };
    }): Promise<readonly AiConnectedStoreRecord[]>;
  };
  readonly commerceOrder: {
    findMany(args: {
      readonly where: { readonly businessId: string; readonly connectedStore: ActiveConnectedStoreWhereInput };
      readonly select: AiOrderSelect;
      readonly orderBy: { readonly orderedAt: "desc" };
      readonly take: number;
    }): Promise<readonly AiOrderRecord[]>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: { readonly businessId: string; readonly connectedStore: ActiveConnectedStoreWhereInput };
      readonly select: AiOrderItemSelect;
      readonly take: number;
    }): Promise<readonly AiOrderItemRecord[]>;
  };
  readonly commerceProduct: {
    findMany(args: {
      readonly where: { readonly businessId: string; readonly connectedStore: ActiveConnectedStoreWhereInput };
      readonly select: AiProductSelect;
      readonly take: number;
    }): Promise<readonly AiProductRecord[]>;
  };
  readonly commerceCustomer: {
    findMany(args: {
      readonly where: { readonly businessId: string; readonly connectedStore: ActiveConnectedStoreWhereInput };
      readonly select: AiCustomerSelect;
      readonly take: number;
    }): Promise<readonly AiCustomerRecord[]>;
  };
  readonly commerceRefund: {
    findMany(args: {
      readonly where: { readonly businessId: string; readonly connectedStore: ActiveConnectedStoreWhereInput };
      readonly select: AiRefundSelect;
      readonly take: number;
    }): Promise<readonly AiRefundRecord[]>;
  };
}

interface ActiveConnectedStoreWhereInput {
  readonly connectionStatus: StoreConnectionStatus.Connected;
  readonly disconnectedAt: null;
}

interface AiOrderSelect {
  readonly id: true;
  readonly connectedStoreId: true;
  readonly platform: true;
  readonly orderStatus: true;
  readonly totalAmount: true;
  readonly orderedAt: true;
}

interface AiOrderItemSelect {
  readonly name: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly quantity: true;
  readonly totalAmount: true;
  readonly order: { readonly select: { readonly orderStatus: true } };
}

interface AiProductSelect {
  readonly id: true;
  readonly platform: true;
  readonly name: true;
  readonly stockStatus: true;
  readonly currentStockQuantity: true;
}

interface AiCustomerSelect {
  readonly id: true;
  readonly platform: true;
}

interface AiRefundSelect {
  readonly id: true;
  readonly platform: true;
  readonly amount: true;
  readonly refundedAt: true;
}

@Injectable()
export class AiBriefingService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ObservationEngine) private readonly observationEngine: ObservationEngine,
    @Inject(DiagnosticEngine) private readonly diagnosticEngine: DiagnosticEngine,
    @Inject(RecommendationEngine) private readonly recommendationEngine: RecommendationEngine,
    @Inject(ForecastingEngine) private readonly forecastingEngine: ForecastingEngine,
    @Inject(BusinessHealthEngine) private readonly businessHealthEngine: BusinessHealthEngine,
    @Inject(ConfidenceEngine) private readonly confidenceEngine: ConfidenceEngine,
    @Inject(ExplainabilityEngine) private readonly explainabilityEngine: ExplainabilityEngine,
    @Inject(ExecutiveSummaryEngine) private readonly executiveSummaryEngine: ExecutiveSummaryEngine,
  ) {}

  async getTodayBriefing(userId: string): Promise<AiBriefingTodayResponse> {
    const data = await this.loadSafeBusinessData(userId);
    const generatedAt = data.now.toISOString();

    if (!hasSufficientAiData(data)) {
      return {
        status: "INSUFFICIENT_DATA",
        message: insufficientDataMessage,
        generatedAt,
        observations: [],
        risks: [],
        opportunities: [],
        recommendations: [],
        forecasts: [],
        confidence: {
          level: "LOW",
          score: 0,
          summary: "Confidence is low because synchronized revenue-eligible commerce data is not available yet.",
          factors: ["Connect and synchronize at least one commerce platform."],
        },
        explainability: this.explainabilityEngine.generate(),
      };
    }

    const metrics = buildAiMetrics(data);
    const observations = this.observationEngine.generate(metrics);
    const risks = this.diagnosticEngine.generateRisks(metrics);
    const opportunities = this.diagnosticEngine.generateOpportunities(metrics);
    const recommendations = this.recommendationEngine.generate(risks);
    const businessHealth = this.businessHealthEngine.generate(metrics);
    const confidence = this.confidenceEngine.generate(data, metrics);
    const explainability = this.explainabilityEngine.generate();

    return {
      status: "READY",
      generatedAt,
      businessOverview: {
        businessId: data.business.id,
        businessName: data.business.name,
        connectedStores: data.connectedStores.length,
        connectedPlatforms: metrics.connectedPlatforms,
        synchronizedStores: metrics.synchronizedStores,
        revenueToday: metrics.revenueToday,
        revenueYesterday: metrics.revenueYesterday,
        ordersToday: metrics.ordersToday,
        refundsToday: metrics.refundsToday,
        productsTracked: metrics.productsTracked,
        customersTracked: metrics.customersTracked,
        lowStockProducts: metrics.lowStockProducts,
        outOfStockProducts: metrics.outOfStockProducts,
      },
      executiveSummary: this.executiveSummaryEngine.generate(data, metrics),
      observations,
      risks,
      opportunities,
      recommendations,
      forecasts: this.forecastingEngine.generate(metrics),
      businessHealth,
      confidence,
      explainability,
    };
  }

  private async loadSafeBusinessData(userId: string): Promise<AiSourceData> {
    const prisma = this.prismaService.client as unknown as AiBriefingPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    if (!business) {
      throw new UnauthorizedException("Company profile is required before using Salense AI.");
    }

    const activeStoreWhere = activeConnectedStoreWhere();
    const [connectedStores, orders, orderItems, products, customers, refunds] = await Promise.all([
      prisma.connectedStore.findMany({
        where: {
          businessId: business.id,
          connectionStatus: StoreConnectionStatus.Connected,
          disconnectedAt: null,
        },
        select: {
          id: true,
          platform: true,
          storeName: true,
          lastSynchronisedAt: true,
        },
        orderBy: { storeName: "asc" },
      }),
      prisma.commerceOrder.findMany({
        where: { businessId: business.id, connectedStore: activeStoreWhere },
        select: {
          id: true,
          connectedStoreId: true,
          platform: true,
          orderStatus: true,
          totalAmount: true,
          orderedAt: true,
        },
        orderBy: { orderedAt: "desc" },
        take: 500,
      }),
      prisma.commerceOrderItem.findMany({
        where: { businessId: business.id, connectedStore: activeStoreWhere },
        select: {
          name: true,
          platform: true,
          platformProductId: true,
          quantity: true,
          totalAmount: true,
          order: { select: { orderStatus: true } },
        },
        take: 1000,
      }),
      prisma.commerceProduct.findMany({
        where: { businessId: business.id, connectedStore: activeStoreWhere },
        select: {
          id: true,
          platform: true,
          name: true,
          stockStatus: true,
          currentStockQuantity: true,
        },
        take: 500,
      }),
      prisma.commerceCustomer.findMany({
        where: { businessId: business.id, connectedStore: activeStoreWhere },
        select: { id: true, platform: true },
        take: 500,
      }),
      prisma.commerceRefund.findMany({
        where: { businessId: business.id, connectedStore: activeStoreWhere },
        select: {
          id: true,
          platform: true,
          amount: true,
          refundedAt: true,
        },
        take: 500,
      }),
    ]);

    return {
      business,
      connectedStores,
      orders,
      orderItems,
      products,
      customers,
      refunds,
      now: new Date(),
    };
  }
}

function activeConnectedStoreWhere(): ActiveConnectedStoreWhereInput {
  return {
    connectionStatus: StoreConnectionStatus.Connected,
    disconnectedAt: null,
  };
}
