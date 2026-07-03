import {
  INTEGRATION_FACTORY,
  IntegrationNotImplementedError,
  IntegrationPlatform,
  type IntegrationConfiguration,
  type IntegrationFactory,
  type SynchronisationContext,
} from "@salense/integrations";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { PrepareStoreConnectionRequestDto } from "./dto/prepare-store-connection-request.dto.js";
import type { StoreActionRequestDto } from "./dto/store-action-request.dto.js";
import type { ConnectedStoreResponse } from "./types/connected-store-response.type.js";
import type { StoreConnectionStatus } from "./types/store-connection-status.enum.js";
import {
  isSupportedStorePlatform,
  StorePlatform,
  SUPPORTED_STORE_PLATFORMS,
  type SupportedStorePlatform,
} from "./types/store-platform.enum.js";

interface StoreIntegrationsPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly connectedStore: {
    findMany(args: {
      readonly where: { readonly business: { readonly ownerId: string } };
      readonly orderBy: { readonly createdAt: "asc" };
      readonly select: ConnectedStoreSelect;
    }): Promise<readonly ConnectedStoreRecord[]>;
    findFirst(args: {
      readonly where: {
        readonly businessId?: string;
        readonly id?: string;
        readonly platform?: StorePlatform;
        readonly storeUrl?: string | null;
        readonly region?: string | null;
        readonly disconnectedAt?: null;
        readonly business?: { readonly ownerId: string };
      };
      readonly select:
        | ConnectedStoreSelect
        | { readonly id: true }
        | { readonly id: true; readonly businessId: true; readonly platform: true };
    }): Promise<ConnectedStoreRecord | ConnectedStoreActionRecord | { readonly id: string } | null>;
  };
}

interface ConnectedStoreSelect {
  readonly id: true;
  readonly businessId: true;
  readonly platform: true;
  readonly storeName: true;
  readonly storeUrl: true;
  readonly region: true;
  readonly connectionStatus: true;
  readonly lastSynchronisedAt: true;
  readonly createdAt: true;
  readonly updatedAt: true;
}

interface ConnectedStoreRecord {
  readonly id: string;
  readonly businessId: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
  readonly storeUrl: string | null;
  readonly region: string | null;
  readonly connectionStatus: StoreConnectionStatus;
  readonly lastSynchronisedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface ConnectedStoreActionRecord {
  readonly id: string;
  readonly businessId: string;
  readonly platform: StorePlatform;
}

const connectedStoreSelect = {
  id: true,
  businessId: true,
  platform: true,
  storeName: true,
  storeUrl: true,
  region: true,
  connectionStatus: true,
  lastSynchronisedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies ConnectedStoreSelect;

@Injectable()
export class StoreIntegrationsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(INTEGRATION_FACTORY) private readonly integrationFactory: IntegrationFactory,
  ) {}

  listSupportedPlatforms(): readonly SupportedStorePlatform[] {
    return SUPPORTED_STORE_PLATFORMS;
  }

  async listConnectedStores(userId: string): Promise<readonly ConnectedStoreResponse[]> {
    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const stores = await prisma.connectedStore.findMany({
      where: { business: { ownerId: userId } },
      orderBy: { createdAt: "asc" },
      select: connectedStoreSelect,
    });

    return stores.map(toConnectedStoreResponse);
  }

  async prepareStoreConnection(
    userId: string,
    request: PrepareStoreConnectionRequestDto,
  ): Promise<never> {
    this.assertSupportedPlatform(request.platform);
    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException("Company profile is required before connecting stores.");
    }

    const storeUrl = normalizeOptionalValue(request.storeUrl);
    const region = normalizeOptionalValue(request.region)?.toUpperCase() ?? null;
    const duplicateConnection = await prisma.connectedStore.findFirst({
      where: {
        businessId: business.id,
        platform: request.platform,
        storeUrl,
        region,
        disconnectedAt: null,
      },
      select: { id: true },
    });

    if (duplicateConnection) {
      throw new ConflictException("Duplicate store connections are prohibited.");
    }

    return this.runPlaceholderIntegrationOperation(
      this.integrationFactory.getProvider(toIntegrationPlatform(request.platform)).connect(
        createIntegrationConfiguration({
          businessId: business.id,
          platform: request.platform,
          region,
          storeName: request.storeName.trim(),
          storeUrl,
        }),
      ),
    );
  }

  async disconnectStore(userId: string, request: StoreActionRequestDto): Promise<never> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);
    return this.runPlaceholderIntegrationOperation(
      this.integrationFactory.getProvider(toIntegrationPlatform(store.platform)).disconnect(
        createIntegrationConfiguration({
          businessId: store.businessId,
          platform: store.platform,
          storeId: store.id,
        }),
      ),
    );
  }

  async requestManualSync(userId: string, request: StoreActionRequestDto): Promise<never> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);
    return this.runPlaceholderIntegrationOperation(
      this.integrationFactory
        .getProvider(toIntegrationPlatform(store.platform))
        .synchroniseOrders(createSynchronisationContext(store)),
    );
  }

  private assertSupportedPlatform(platform: string): asserts platform is StorePlatform {
    if (!isSupportedStorePlatform(platform)) {
      throw new BadRequestException("Unsupported store platform.");
    }
  }

  private async assertStoreBelongsToUser(
    userId: string,
    storeId: string,
  ): Promise<ConnectedStoreActionRecord> {
    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const store = await prisma.connectedStore.findFirst({
      where: { id: storeId, business: { ownerId: userId } },
      select: { id: true, businessId: true, platform: true },
    });

    if (!store) {
      throw new NotFoundException("Connected store could not be found.");
    }

    return store as ConnectedStoreActionRecord;
  }

  private async runPlaceholderIntegrationOperation(operation: Promise<unknown>): Promise<never> {
    try {
      await operation;
    } catch (error) {
      if (error instanceof IntegrationNotImplementedError) {
        throw new NotImplementedException(error.message);
      }

      throw error;
    }

    throw new NotImplementedException(
      "Store integration provider returned success before real marketplace integration was implemented.",
    );
  }
}

function normalizeOptionalValue(value: string | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function toConnectedStoreResponse(store: ConnectedStoreRecord): ConnectedStoreResponse {
  return {
    id: store.id,
    businessId: store.businessId,
    platform: store.platform,
    storeName: store.storeName,
    storeUrl: store.storeUrl,
    region: store.region,
    connectionStatus: store.connectionStatus,
    lastSynchronisedAt: store.lastSynchronisedAt,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function toIntegrationPlatform(platform: StorePlatform): IntegrationPlatform {
  switch (platform) {
    case StorePlatform.WooCommerce:
      return IntegrationPlatform.WooCommerce;
    case StorePlatform.AmazonSeller:
      return IntegrationPlatform.AmazonSeller;
    case StorePlatform.TikTokShop:
      return IntegrationPlatform.TikTokShop;
  }

  throw new BadRequestException("Unsupported store platform.");
}

function createIntegrationConfiguration(input: {
  readonly businessId: string;
  readonly platform: StorePlatform;
  readonly region?: string | null;
  readonly storeId?: string;
  readonly storeName?: string;
  readonly storeUrl?: string | null;
}): IntegrationConfiguration {
  return {
    businessId: input.businessId,
    platform: toIntegrationPlatform(input.platform),
    ...(input.region ? { region: input.region } : {}),
    ...(input.storeId ? { storeId: input.storeId } : {}),
    ...(input.storeName ? { storeName: input.storeName } : {}),
    ...(input.storeUrl ? { storeUrl: input.storeUrl } : {}),
  };
}

function createSynchronisationContext(store: ConnectedStoreActionRecord): SynchronisationContext {
  return {
    businessId: store.businessId,
    platform: toIntegrationPlatform(store.platform),
    storeId: store.id,
    triggeredAt: new Date(),
  };
}
