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
  SUPPORTED_STORE_PLATFORMS,
  type SupportedStorePlatform,
  type StorePlatform,
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
      readonly select: ConnectedStoreSelect | { readonly id: true };
    }): Promise<ConnectedStoreRecord | { readonly id: string } | null>;
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
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

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

    throw new NotImplementedException(
      "Store connection preparation requires official platform authentication and is not implemented yet.",
    );
  }

  async disconnectStore(userId: string, request: StoreActionRequestDto): Promise<never> {
    await this.assertStoreBelongsToUser(userId, request.storeId);
    throw new NotImplementedException(
      "Store disconnection requires platform token revocation and is not implemented yet. Historical analytics must be preserved when this is implemented.",
    );
  }

  async requestManualSync(userId: string, request: StoreActionRequestDto): Promise<never> {
    await this.assertStoreBelongsToUser(userId, request.storeId);
    throw new NotImplementedException(
      "Manual store synchronisation requires the sync engine and is not implemented yet.",
    );
  }

  private assertSupportedPlatform(platform: string): asserts platform is StorePlatform {
    if (!isSupportedStorePlatform(platform)) {
      throw new BadRequestException("Unsupported store platform.");
    }
  }

  private async assertStoreBelongsToUser(userId: string, storeId: string): Promise<void> {
    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const store = await prisma.connectedStore.findFirst({
      where: { id: storeId, business: { ownerId: userId } },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException("Connected store could not be found.");
    }
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
