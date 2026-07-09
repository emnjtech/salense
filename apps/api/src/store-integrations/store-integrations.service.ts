import {
  INTEGRATION_FACTORY,
  IntegrationError,
  IntegrationPlatform,
  defaultShopifyAdminApiVersion,
  normalizeShopifyDomain,
  toAmazonSellerApiRegion,
  toTikTokShopApiRegion,
  WooCommerceApiVersion,
  type IntegrationConfiguration,
  type IntegrationFactory,
} from "@salense/integrations";
import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AuditAction,
  AuditLogModule,
  AuditLogResult,
  AuditLogService,
  sanitizeAuditMetadata,
} from "../audit/index.js";
import { PrismaService } from "../database/prisma.service.js";
import type { PrepareStoreConnectionRequestDto } from "./dto/prepare-store-connection-request.dto.js";
import type { StoreActionRequestDto } from "./dto/store-action-request.dto.js";
import { AesCredentialEncryptionService } from "./security/credential-encryption.service.js";
import {
  CommerceSyncCursorResource,
  type CommerceSyncCursorStatus,
} from "./sync-cursors/commerce-sync-cursor.types.js";
import {
  SYNC_QUEUE,
  AmazonSellerSyncJobName,
  ShopifySyncJobName,
  TikTokShopSyncJobName,
  WooCommerceSyncJobName,
  type SyncJobEnqueueResult,
  type SyncJobStatusResult,
  type SyncQueuePort,
  type StoreSyncJobStatusResult,
} from "./sync-queue/sync-queue.types.js";
import { WooCommerceSyncSchedulingService } from "./sync-queue/woocommerce-sync-scheduling.service.js";
import type { ConnectedStoreResponse } from "./types/connected-store-response.type.js";
import type { DisconnectStoreResponse } from "./types/disconnect-store-response.type.js";
import { StoreConnectionStatus } from "./types/store-connection-status.enum.js";
import type {
  ManualSyncJobStatusResponse,
  ManualSyncResponse,
} from "./types/manual-sync-response.type.js";
import type {
  SyncScheduleRemovalResponse,
  SyncScheduleResponse,
} from "./types/sync-schedule-response.type.js";
import type {
  StoreSyncCursorStatusResponse,
  StoreSyncJobStatusResponse,
  StoreSyncStatusResponse,
} from "./types/store-sync-status-response.type.js";
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
      readonly where: {
        readonly business: { readonly ownerId: string };
        readonly disconnectedAt?: null;
      };
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
      readonly select: ConnectedStoreSelect | { readonly id: true } | ConnectedStoreActionSelect;
    }): Promise<ConnectedStoreRecord | ConnectedStoreActionRecord | { readonly id: string } | null>;
    create(args: {
      readonly data: ConnectedStoreCreateData;
      readonly select: ConnectedStoreSelect;
    }): Promise<ConnectedStoreRecord>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: ConnectedStoreUpdateData;
      readonly select: ConnectedStoreSelect | ConnectedStoreActionSelect;
    }): Promise<ConnectedStoreRecord | ConnectedStoreActionRecord>;
  };
  readonly commerceSyncCursor: {
    findMany(args: {
      readonly where: { readonly connectedStoreId: string };
      readonly orderBy: { readonly resource: "asc" };
      readonly select: CommerceSyncCursorSelect;
    }): Promise<readonly CommerceSyncCursorRecord[]>;
  };
}

interface ConnectedStoreCreateData {
  readonly businessId: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
  readonly storeUrl?: string | null;
  readonly region?: string | null;
  readonly connectionStatus: StoreConnectionStatus;
  readonly accessTokenHash?: string;
  readonly accessTokenMetadata?: Readonly<Record<string, unknown>>;
  readonly refreshTokenHash?: string;
  readonly refreshTokenMetadata?: Readonly<Record<string, unknown>>;
}

interface ConnectedStoreUpdateData {
  readonly connectionStatus: StoreConnectionStatus;
  readonly accessTokenHash?: string;
  readonly accessTokenMetadata?: Readonly<Record<string, unknown>>;
  readonly refreshTokenHash?: string;
  readonly refreshTokenMetadata?: Readonly<Record<string, unknown>>;
  readonly disconnectedAt?: Date | null;
  readonly region?: string | null;
  readonly storeName?: string;
  readonly storeUrl?: string | null;
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
  readonly connectionStatus: StoreConnectionStatus;
  readonly disconnectedAt: Date | null;
  readonly lastSynchronisedAt: Date | null;
  readonly platform: StorePlatform;
}

interface ConnectedStoreActionSelect {
  readonly id: true;
  readonly businessId: true;
  readonly connectionStatus: true;
  readonly disconnectedAt: true;
  readonly lastSynchronisedAt: true;
  readonly platform: true;
}

interface CommerceSyncCursorSelect {
  readonly errorMetadata: true;
  readonly lastAttemptedSyncedAt: true;
  readonly lastSuccessfulSyncedAt: true;
  readonly resource: true;
  readonly status: true;
}

interface CommerceSyncCursorRecord {
  readonly errorMetadata: Readonly<Record<string, unknown>> | null;
  readonly lastAttemptedSyncedAt: Date | null;
  readonly lastSuccessfulSyncedAt: Date | null;
  readonly resource: CommerceSyncCursorResource;
  readonly status: CommerceSyncCursorStatus;
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

const connectedStoreActionSelect = {
  id: true,
  businessId: true,
  connectionStatus: true,
  disconnectedAt: true,
  lastSynchronisedAt: true,
  platform: true,
} satisfies ConnectedStoreActionSelect;

const commerceSyncCursorSelect = {
  errorMetadata: true,
  lastAttemptedSyncedAt: true,
  lastSuccessfulSyncedAt: true,
  resource: true,
  status: true,
} satisfies CommerceSyncCursorSelect;

const syncStatusResources = [
  CommerceSyncCursorResource.Orders,
  CommerceSyncCursorResource.Products,
  CommerceSyncCursorResource.Customers,
  CommerceSyncCursorResource.Inventory,
  CommerceSyncCursorResource.Categories,
  CommerceSyncCursorResource.Refunds,
] as const;

type CredentialConfiguration = Pick<
  IntegrationConfiguration,
  | "accessTokenHash"
  | "accessTokenMetadata"
  | "apiVersion"
  | "consumerKey"
  | "consumerKeyMetadata"
  | "consumerSecret"
  | "consumerSecretMetadata"
  | "refreshTokenHash"
  | "refreshTokenMetadata"
> & {
  readonly amazonSellerValidationAccessToken?: string;
  readonly auditApiVersion?: string;
  readonly shopifyValidationAccessToken?: string;
  readonly tikTokShopValidationAccessToken?: string;
};

@Injectable()
export class StoreIntegrationsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(INTEGRATION_FACTORY) private readonly integrationFactory: IntegrationFactory,
    @Inject(AesCredentialEncryptionService)
    private readonly credentialEncryption: AesCredentialEncryptionService,
    @Inject(SYNC_QUEUE)
    private readonly syncQueue: SyncQueuePort,
    @Inject(WooCommerceSyncSchedulingService)
    private readonly syncSchedulingService: WooCommerceSyncSchedulingService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  listSupportedPlatforms(): readonly SupportedStorePlatform[] {
    return SUPPORTED_STORE_PLATFORMS;
  }

  async listConnectedStores(userId: string): Promise<readonly ConnectedStoreResponse[]> {
    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const stores = await prisma.connectedStore.findMany({
      where: { business: { ownerId: userId }, disconnectedAt: null },
      orderBy: { createdAt: "asc" },
      select: connectedStoreSelect,
    });

    return stores.map(toConnectedStoreResponse);
  }

  async prepareStoreConnection(
    userId: string,
    request: PrepareStoreConnectionRequestDto,
  ): Promise<ConnectedStoreResponse> {
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
    const existingConnection = (await prisma.connectedStore.findFirst({
      where: {
        businessId: business.id,
        platform: request.platform,
        storeUrl,
        region,
      },
      select: connectedStoreSelect,
    })) as ConnectedStoreRecord | null;

    if (existingConnection && isActiveConnectionStatus(existingConnection.connectionStatus)) {
      throw new ConflictException("This store is already connected.");
    }

    const credentialConfiguration = this.createCredentialConfiguration(request);
    const connectionData = {
      accessTokenHash: credentialConfiguration.accessTokenHash ?? "",
      accessTokenMetadata: credentialConfiguration.accessTokenMetadata ?? {},
      connectionStatus: StoreConnectionStatus.PendingValidation,
      disconnectedAt: null,
      refreshTokenHash: credentialConfiguration.refreshTokenHash ?? "",
      refreshTokenMetadata: credentialConfiguration.refreshTokenMetadata ?? {},
      region,
      storeName: request.storeName.trim(),
      storeUrl,
    } satisfies ConnectedStoreUpdateData;
    const connectedStore = existingConnection
      ? await prisma.connectedStore.update({
          where: { id: existingConnection.id },
          data: connectionData,
          select: connectedStoreSelect,
        })
      : await prisma.connectedStore.create({
          data: {
            businessId: business.id,
            platform: request.platform,
            ...connectionData,
          },
          select: connectedStoreSelect,
        });

    await this.recordStoreIntegrationAuditEvent({
      action: getConnectionCreatedAuditAction(request.platform),
      affectedPlatform: request.platform,
      businessId: business.id,
      metadata: {
        apiVersion: credentialConfiguration.auditApiVersion,
        connectionStatus: connectedStore.connectionStatus,
        marketplaceId: getSafeMarketplaceId(credentialConfiguration.accessTokenMetadata),
        region,
        storeUrl,
      },
      result: AuditLogResult.Success,
      storeId: connectedStore.id,
      userId,
    });

    const integrationPlatform = toIntegrationPlatform(request.platform);
    const provider = this.integrationFactory.getProvider(integrationPlatform);

    try {
      await provider.validateConnection(
        createIntegrationConfiguration({
          businessId: business.id,
          platform: request.platform,
          region,
          storeId: connectedStore.id,
          storeName: request.storeName.trim(),
          storeUrl,
          ...credentialConfiguration,
          ...(credentialConfiguration.amazonSellerValidationAccessToken
            ? { accessTokenHash: credentialConfiguration.amazonSellerValidationAccessToken }
            : {}),
          ...(credentialConfiguration.tikTokShopValidationAccessToken
            ? { accessTokenHash: credentialConfiguration.tikTokShopValidationAccessToken }
            : {}),
          ...(credentialConfiguration.shopifyValidationAccessToken
            ? { accessTokenHash: credentialConfiguration.shopifyValidationAccessToken }
            : {}),
        }),
      );
      const validatedStore = await prisma.connectedStore.update({
        where: { id: connectedStore.id },
        data: { connectionStatus: StoreConnectionStatus.Connected },
        select: connectedStoreSelect,
      });

      await this.recordStoreIntegrationAuditEvent({
        action: getConnectionSucceededAuditAction(request.platform),
        affectedPlatform: request.platform,
        businessId: business.id,
        metadata: {
          connectionStatus: validatedStore.connectionStatus,
          marketplaceId: getSafeMarketplaceId(credentialConfiguration.accessTokenMetadata),
          region,
          storeUrl,
        },
        result: AuditLogResult.Success,
        storeId: connectedStore.id,
        userId,
      });

      await this.queueInitialSyncAfterConnection(
        toConnectedStoreActionRecord(validatedStore as ConnectedStoreRecord),
        userId,
      );

      return toConnectedStoreResponse(validatedStore as ConnectedStoreRecord);
    } catch (error) {
      const validationFailureReason = toSafeConnectionValidationFailureReason(error);
      const failedStore = await prisma.connectedStore.update({
        where: { id: connectedStore.id },
        data: {
          connectionStatus: StoreConnectionStatus.Error,
          disconnectedAt: new Date(),
        },
        select: connectedStoreSelect,
      });

      await this.recordStoreIntegrationAuditEvent({
        action: getConnectionFailedAuditAction(request.platform),
        affectedPlatform: request.platform,
        businessId: business.id,
        metadata: {
          connectionStatus: failedStore.connectionStatus,
          errorName: error instanceof Error ? error.name : "UnknownError",
          marketplaceId: getSafeMarketplaceId(credentialConfiguration.accessTokenMetadata),
          region,
          safeReason: validationFailureReason,
          storeUrl,
        },
        result: AuditLogResult.Failure,
        storeId: connectedStore.id,
        userId,
      });

      return {
        ...toConnectedStoreResponse(failedStore as ConnectedStoreRecord),
        validationFailureReason,
      };
    }
  }

  private createCredentialConfiguration(
    request: PrepareStoreConnectionRequestDto,
  ): CredentialConfiguration {
    if (request.platform === StorePlatform.AmazonSeller) {
      const credentials = request.amazonSellerCredentials;

      if (!request.region?.trim()) {
        throw new BadRequestException("Amazon Seller region is required.");
      }

      if (!credentials) {
        throw new BadRequestException("Amazon Seller credentials are required.");
      }

      const apiRegion = toAmazonSellerApiRegion(request.region);
      const encryptedAccessToken = this.credentialEncryption.encrypt(
        credentials.accessToken.trim(),
      );
      const encryptedRefreshToken = this.credentialEncryption.encrypt(
        credentials.refreshToken.trim(),
      );

      return {
        accessTokenHash: hashCredentialPlaceholder(credentials.accessToken),
        accessTokenMetadata: {
          credentialKind: "amazon_seller_access_token",
          encryptedCredential: encryptedAccessToken,
          marketplaceId: credentials.marketplaceId.trim(),
          region: apiRegion,
          sellerId: credentials.sellerId.trim(),
        },
        amazonSellerValidationAccessToken: credentials.accessToken.trim(),
        apiVersion: credentials.marketplaceId.trim(),
        auditApiVersion: credentials.marketplaceId.trim(),
        consumerKey: credentials.sellerId.trim(),
        consumerKeyMetadata: {
          configured: true,
          keyId: encryptedAccessToken.keyId,
        },
        refreshTokenHash: hashCredentialPlaceholder(credentials.refreshToken),
        refreshTokenMetadata: {
          credentialKind: "amazon_seller_refresh_token",
          encryptedCredential: encryptedRefreshToken,
          marketplaceId: credentials.marketplaceId.trim(),
          region: apiRegion,
          sellerId: credentials.sellerId.trim(),
        },
      };
    }

    if (request.platform === StorePlatform.TikTokShop) {
      const credentials = request.tikTokShopCredentials;

      if (!request.region?.trim()) {
        throw new BadRequestException("TikTok Shop region is required.");
      }

      if (!credentials) {
        throw new BadRequestException("TikTok Shop credentials are required.");
      }

      const apiRegion = toTikTokShopApiRegion(request.region);
      const encryptedAccessToken = this.credentialEncryption.encrypt(
        credentials.accessToken.trim(),
      );
      const encryptedRefreshToken = this.credentialEncryption.encrypt(
        credentials.refreshToken.trim(),
      );

      return {
        accessTokenHash: hashCredentialPlaceholder(credentials.accessToken),
        accessTokenMetadata: {
          credentialKind: "tiktok_shop_access_token",
          encryptedCredential: encryptedAccessToken,
          region: apiRegion,
          shopCipher: credentials.shopCipher.trim(),
          shopId: credentials.shopId.trim(),
        },
        apiVersion: credentials.shopCipher.trim(),
        auditApiVersion: credentials.shopCipher.trim(),
        consumerKey: credentials.shopId.trim(),
        consumerKeyMetadata: {
          configured: true,
          keyId: encryptedAccessToken.keyId,
        },
        refreshTokenHash: hashCredentialPlaceholder(credentials.refreshToken),
        refreshTokenMetadata: {
          credentialKind: "tiktok_shop_refresh_token",
          encryptedCredential: encryptedRefreshToken,
          region: apiRegion,
          shopCipher: credentials.shopCipher.trim(),
          shopId: credentials.shopId.trim(),
        },
        tikTokShopValidationAccessToken: credentials.accessToken.trim(),
      };
    }

    if (request.platform === StorePlatform.Shopify) {
      const credentials = request.shopifyCredentials;
      const shopDomain = normalizeShopifyDomain(credentials?.shopDomain ?? request.storeUrl);

      if (!request.storeUrl?.trim()) {
        throw new BadRequestException("Shopify store URL is required.");
      }

      if (!credentials) {
        throw new BadRequestException("Shopify credentials are required.");
      }

      if (!shopDomain) {
        throw new BadRequestException("Shopify shop domain is required.");
      }

      const apiVersion = credentials.apiVersion?.trim() || defaultShopifyAdminApiVersion;
      const encryptedAccessToken = this.credentialEncryption.encrypt(
        credentials.accessToken.trim(),
      );

      return {
        accessTokenHash: hashCredentialPlaceholder(credentials.accessToken),
        accessTokenMetadata: {
          apiVersion,
          credentialKind: "shopify_admin_access_token",
          encryptedCredential: encryptedAccessToken,
          shopDomain,
        },
        apiVersion,
        auditApiVersion: apiVersion,
        consumerKey: shopDomain,
        consumerKeyMetadata: {
          configured: true,
          keyId: encryptedAccessToken.keyId,
        },
        refreshTokenHash: "",
        refreshTokenMetadata: {
          apiVersion,
          credentialKind: "shopify_no_refresh_token_for_private_app_token",
          shopDomain,
        },
        shopifyValidationAccessToken: credentials.accessToken.trim(),
      };
    }

    if (request.platform !== StorePlatform.WooCommerce) {
      return {};
    }

    if (!request.storeUrl?.trim()) {
      throw new BadRequestException("WooCommerce store URL is required.");
    }

    const credentials = request.wooCommerceCredentials;

    if (!credentials) {
      throw new BadRequestException("WooCommerce credentials are required.");
    }

    if (credentials.apiVersion !== WooCommerceApiVersion.WcV3) {
      throw new BadRequestException("WooCommerce API version is not supported.");
    }

    const encryptedConsumerKey = this.credentialEncryption.encrypt(credentials.consumerKey.trim());
    const encryptedConsumerSecret = this.credentialEncryption.encrypt(
      credentials.consumerSecret.trim(),
    );

    return {
      accessTokenHash: hashCredentialPlaceholder(credentials.consumerKey),
      accessTokenMetadata: {
        apiVersion: credentials.apiVersion,
        credentialKind: "woocommerce_consumer_key",
        encryptedCredential: encryptedConsumerKey,
      },
      apiVersion: credentials.apiVersion,
      auditApiVersion: credentials.apiVersion,
      consumerKey: credentials.consumerKey.trim(),
      consumerKeyMetadata: {
        configured: true,
        keyId: encryptedConsumerKey.keyId,
      },
      consumerSecret: credentials.consumerSecret.trim(),
      consumerSecretMetadata: {
        configured: true,
        keyId: encryptedConsumerSecret.keyId,
      },
      refreshTokenHash: hashCredentialPlaceholder(credentials.consumerSecret),
      refreshTokenMetadata: {
        apiVersion: credentials.apiVersion,
        credentialKind: "woocommerce_consumer_secret",
        encryptedCredential: encryptedConsumerSecret,
      },
    };
  }

  async disconnectStore(
    userId: string,
    request: StoreActionRequestDto,
  ): Promise<DisconnectStoreResponse> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);

    if (store.connectionStatus === StoreConnectionStatus.Disconnected || store.disconnectedAt) {
      throw new ConflictException("Store is already disconnected.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Store must be connected before it can be disconnected.");
    }

    await this.syncSchedulingService.removeAutomaticSync(store);

    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const disconnectedStore = await prisma.connectedStore.update({
      where: { id: store.id },
      data: {
        connectionStatus: StoreConnectionStatus.Disconnected,
        disconnectedAt: new Date(),
      },
      select: connectedStoreActionSelect,
    });

    await this.recordStoreIntegrationAuditEvent({
      action: AuditAction.StoreDisconnected,
      affectedPlatform: store.platform,
      businessId: store.businessId,
      metadata: {
        connectionStatus: StoreConnectionStatus.Disconnected,
        disconnectedAt: (disconnectedStore as ConnectedStoreActionRecord).disconnectedAt,
      },
      result: AuditLogResult.Success,
      storeId: store.id,
      userId,
    });

    return toDisconnectStoreResponse(disconnectedStore as ConnectedStoreActionRecord);
  }

  async requestManualSync(
    userId: string,
    request: StoreActionRequestDto,
  ): Promise<ManualSyncResponse> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Store must be connected before manual synchronisation.");
    }

    const queuedAt = new Date();
    const queuedJob = await this.enqueueManualSyncJob(store, userId, queuedAt);

    await this.recordStoreIntegrationAuditEvent({
      action: AuditAction.ManualSyncJobQueued,
      affectedPlatform: store.platform,
      businessId: store.businessId,
      metadata: {
        jobId: queuedJob.jobId,
        queuedAt: queuedJob.queuedAt,
        resource: "all",
      },
      result: AuditLogResult.Success,
      storeId: store.id,
      userId,
    });

    return toManualSyncResponse(queuedJob);
  }

  async getManualSyncJobStatus(
    userId: string,
    jobId: string,
  ): Promise<ManualSyncJobStatusResponse> {
    const jobStatus = await this.syncQueue.getJobStatus(jobId);

    if (!jobStatus) {
      throw new NotFoundException("Sync job could not be found.");
    }

    await this.assertStoreBelongsToUser(userId, jobStatus.storeId);

    return toManualSyncJobStatusResponse(jobStatus);
  }

  async getStoreSyncStatus(userId: string, storeId: string): Promise<StoreSyncStatusResponse> {
    const store = await this.assertStoreBelongsToUser(userId, storeId);

    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const cursors = await prisma.commerceSyncCursor.findMany({
      where: { connectedStoreId: store.id },
      orderBy: { resource: "asc" },
      select: commerceSyncCursorSelect,
    });
    const jobs = await this.getSafeStoreJobStatuses(store.id, store.platform);

    return {
      connectionStatus: store.connectionStatus,
      cursors: toStoreSyncCursorStatuses(cursors),
      jobs,
      lastSynchronisedAt: store.lastSynchronisedAt,
      platform: store.platform,
      storeId: store.id,
    };
  }

  async scheduleAutomaticSync(
    userId: string,
    request: StoreActionRequestDto,
  ): Promise<SyncScheduleResponse> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);

    const schedule = await this.syncSchedulingService.scheduleAutomaticSync(store, userId);

    await this.recordStoreIntegrationAuditEvent({
      action: AuditAction.ScheduledSyncCreated,
      affectedPlatform: store.platform,
      businessId: store.businessId,
      metadata: {
        everyMs: schedule.everyMs,
        jobId: schedule.jobId,
        scheduledAt: schedule.scheduledAt,
      },
      result: AuditLogResult.Success,
      storeId: store.id,
      userId,
    });

    return schedule;
  }

  async removeAutomaticSyncSchedule(
    userId: string,
    request: StoreActionRequestDto,
  ): Promise<SyncScheduleRemovalResponse> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);

    const removal = await this.syncSchedulingService.removeAutomaticSync(store);

    await this.recordStoreIntegrationAuditEvent({
      action: AuditAction.ScheduledSyncRemoved,
      affectedPlatform: store.platform,
      businessId: store.businessId,
      metadata: {
        jobId: removal.jobId,
        removedAt: removal.removedAt,
        status: removal.status,
      },
      result: AuditLogResult.Success,
      storeId: store.id,
      userId,
    });

    return removal;
  }

  private async recordStoreIntegrationAuditEvent(input: {
    readonly action: AuditAction;
    readonly affectedPlatform?: StorePlatform;
    readonly businessId: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly result: AuditLogResult;
    readonly storeId: string;
    readonly userId: string;
  }): Promise<void> {
    await this.auditLogService.record({
      action: input.action,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: input.affectedPlatform ?? StorePlatform.WooCommerce,
      affectedStoreId: input.storeId,
      businessId: input.businessId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      result: input.result,
      userId: input.userId,
    });
  }

  private async getSafeStoreJobStatuses(
    storeId: string,
    platform: StorePlatform,
  ): Promise<readonly StoreSyncJobStatusResponse[]> {
    try {
      const jobs =
        platform === StorePlatform.TikTokShop
          ? await this.syncQueue.getTikTokShopStoreJobStatuses(storeId)
          : platform === StorePlatform.Shopify
            ? await this.syncQueue.getShopifyStoreJobStatuses(storeId)
            : platform === StorePlatform.AmazonSeller
              ? await this.syncQueue.getAmazonSellerStoreJobStatuses(storeId)
              : await this.syncQueue.getWooCommerceStoreJobStatuses(storeId);

      return jobs.map(toStoreSyncJobStatusResponse);
    } catch {
      return [];
    }
  }

  private async queueInitialSyncAfterConnection(
    store: ConnectedStoreActionRecord,
    userId: string,
  ): Promise<void> {
    try {
      const queuedAt = new Date();
      const queuedJob = await this.enqueueManualSyncJob(store, userId, queuedAt);

      await this.recordStoreIntegrationAuditEvent({
        action: AuditAction.ManualSyncJobQueued,
        affectedPlatform: store.platform,
        businessId: store.businessId,
        metadata: {
          initialSync: true,
          jobId: queuedJob.jobId,
          queuedAt: queuedJob.queuedAt,
          resource: "all",
        },
        result: AuditLogResult.Success,
        storeId: store.id,
        userId,
      });
    } catch (error) {
      await this.recordStoreIntegrationAuditEvent({
        action: AuditAction.ManualSyncJobQueued,
        affectedPlatform: store.platform,
        businessId: store.businessId,
        metadata: {
          errorName: error instanceof Error ? error.name : "UnknownError",
          initialSync: true,
          resource: "all",
        },
        result: AuditLogResult.Failure,
        storeId: store.id,
        userId,
      });
    }
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
      select: connectedStoreActionSelect,
    });

    if (!store) {
      throw new NotFoundException("Connected store could not be found.");
    }

    return store as ConnectedStoreActionRecord;
  }

  private async enqueueManualSyncJob(
    store: ConnectedStoreActionRecord,
    userId: string,
    queuedAt: Date,
  ): Promise<SyncJobEnqueueResult> {
    switch (store.platform) {
      case StorePlatform.AmazonSeller:
        return this.syncQueue.enqueueAmazonSellerSyncJob(AmazonSellerSyncJobName.ManualFullSync, {
          platform: StorePlatform.AmazonSeller,
          queuedAt: queuedAt.toISOString(),
          requestedByUserId: userId,
          resource: "all",
          storeId: store.id,
        });
      case StorePlatform.TikTokShop:
        return this.syncQueue.enqueueTikTokShopSyncJob(TikTokShopSyncJobName.ManualFullSync, {
          platform: StorePlatform.TikTokShop,
          queuedAt: queuedAt.toISOString(),
          requestedByUserId: userId,
          resource: "all",
          storeId: store.id,
        });
      case StorePlatform.Shopify:
        return this.syncQueue.enqueueShopifySyncJob(ShopifySyncJobName.ManualFullSync, {
          platform: StorePlatform.Shopify,
          queuedAt: queuedAt.toISOString(),
          requestedByUserId: userId,
          resource: "all",
          storeId: store.id,
        });
      case StorePlatform.WooCommerce:
        return this.syncQueue.enqueueWooCommerceSyncJob(WooCommerceSyncJobName.ManualFullSync, {
          platform: StorePlatform.WooCommerce,
          queuedAt: queuedAt.toISOString(),
          requestedByUserId: userId,
          resource: "all",
          storeId: store.id,
        });
    }
  }
}

function normalizeOptionalValue(value: string | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function hashCredentialPlaceholder(value: string): string {
  return createHash("sha256").update(value.trim(), "utf8").digest("hex");
}

function isActiveConnectionStatus(status: StoreConnectionStatus): boolean {
  return [
    StoreConnectionStatus.AuthenticationExpired,
    StoreConnectionStatus.Connected,
    StoreConnectionStatus.PendingValidation,
    StoreConnectionStatus.Synchronising,
  ].includes(status);
}

function toSafeConnectionValidationFailureReason(error: unknown): string {
  const errorName = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (errorName.includes("Authentication") || message.includes("auth")) {
    return "WooCommerce rejected the credentials or the key does not have read permission.";
  }

  if (
    errorName.includes("Connection") ||
    message.includes("unreachable") ||
    message.includes("timed out") ||
    message.includes("timeout")
  ) {
    return appendSafeIntegrationDetails(
      "The WooCommerce store URL could not be reached from Salense.",
      error,
    );
  }

  if (message.includes("required") || message.includes("configuration")) {
    return "Please check that the WooCommerce store URL, consumer key, and consumer secret are complete.";
  }

  return "WooCommerce could not validate this connection. Please check the store URL and read-only REST API key.";
}

function appendSafeIntegrationDetails(message: string, error: unknown): string {
  if (!(error instanceof IntegrationError)) {
    return message;
  }

  const endpoint =
    typeof error.metadata?.endpoint === "string" ? error.metadata.endpoint : undefined;
  const status = typeof error.metadata?.status === "number" ? error.metadata.status : undefined;
  const fallbackStatus =
    typeof error.metadata?.fallbackStatus === "number" ? error.metadata.fallbackStatus : undefined;
  const details = [
    endpoint ? `endpoint ${endpoint}` : undefined,
    status ? `HTTP ${status}` : undefined,
    fallbackStatus ? `fallback HTTP ${fallbackStatus}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return details ? `${message} (${details})` : message;
}

function getConnectionCreatedAuditAction(platform: StorePlatform): AuditAction {
  switch (platform) {
    case StorePlatform.WooCommerce:
      return AuditAction.WooCommerceConnectionCreated;
    case StorePlatform.AmazonSeller:
      return AuditAction.AmazonSellerConnectionCreated;
    case StorePlatform.TikTokShop:
      return AuditAction.TikTokShopConnectionCreated;
    case StorePlatform.Shopify:
      return AuditAction.ShopifyConnectionCreated;
  }
}

function getConnectionSucceededAuditAction(platform: StorePlatform): AuditAction {
  switch (platform) {
    case StorePlatform.WooCommerce:
      return AuditAction.WooCommerceConnectionValidationSucceeded;
    case StorePlatform.AmazonSeller:
      return AuditAction.AmazonSellerConnectionValidationSucceeded;
    case StorePlatform.TikTokShop:
      return AuditAction.TikTokShopConnectionValidationSucceeded;
    case StorePlatform.Shopify:
      return AuditAction.ShopifyConnectionValidationSucceeded;
  }
}

function getConnectionFailedAuditAction(platform: StorePlatform): AuditAction {
  switch (platform) {
    case StorePlatform.WooCommerce:
      return AuditAction.WooCommerceConnectionValidationFailed;
    case StorePlatform.AmazonSeller:
      return AuditAction.AmazonSellerConnectionValidationFailed;
    case StorePlatform.TikTokShop:
      return AuditAction.TikTokShopConnectionValidationFailed;
    case StorePlatform.Shopify:
      return AuditAction.ShopifyConnectionValidationFailed;
  }
}

function getSafeMarketplaceId(
  metadata: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  return typeof metadata?.marketplaceId === "string" ? metadata.marketplaceId : undefined;
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

function toConnectedStoreActionRecord(store: ConnectedStoreRecord): ConnectedStoreActionRecord {
  return {
    businessId: store.businessId,
    connectionStatus: store.connectionStatus,
    disconnectedAt: null,
    id: store.id,
    lastSynchronisedAt: store.lastSynchronisedAt,
    platform: store.platform,
  };
}

function toDisconnectStoreResponse(store: ConnectedStoreActionRecord): DisconnectStoreResponse {
  return {
    disconnectedAt: store.disconnectedAt,
    platform: store.platform,
    status: StoreConnectionStatus.Disconnected,
    storeId: store.id,
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
    case StorePlatform.Shopify:
      return IntegrationPlatform.Shopify;
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
  readonly accessTokenHash?: string;
  readonly accessTokenMetadata?: Readonly<Record<string, unknown>>;
  readonly apiVersion?: string;
  readonly consumerKey?: string;
  readonly consumerKeyMetadata?: IntegrationConfiguration["consumerKeyMetadata"];
  readonly consumerSecret?: string;
  readonly consumerSecretMetadata?: IntegrationConfiguration["consumerSecretMetadata"];
  readonly refreshTokenHash?: string;
  readonly refreshTokenMetadata?: Readonly<Record<string, unknown>>;
}): IntegrationConfiguration {
  return {
    businessId: input.businessId,
    platform: toIntegrationPlatform(input.platform),
    ...(input.accessTokenHash ? { accessTokenHash: input.accessTokenHash } : {}),
    ...(input.accessTokenMetadata ? { accessTokenMetadata: input.accessTokenMetadata } : {}),
    ...(input.apiVersion ? { apiVersion: input.apiVersion } : {}),
    ...(input.consumerKey ? { consumerKey: input.consumerKey } : {}),
    ...(input.consumerKeyMetadata ? { consumerKeyMetadata: input.consumerKeyMetadata } : {}),
    ...(input.consumerSecret ? { consumerSecret: input.consumerSecret } : {}),
    ...(input.consumerSecretMetadata
      ? { consumerSecretMetadata: input.consumerSecretMetadata }
      : {}),
    ...(input.region ? { region: input.region } : {}),
    ...(input.refreshTokenHash ? { refreshTokenHash: input.refreshTokenHash } : {}),
    ...(input.refreshTokenMetadata ? { refreshTokenMetadata: input.refreshTokenMetadata } : {}),
    ...(input.storeId ? { storeId: input.storeId } : {}),
    ...(input.storeName ? { storeName: input.storeName } : {}),
    ...(input.storeUrl ? { storeUrl: input.storeUrl } : {}),
  };
}

function toManualSyncResponse(queuedJob: SyncJobEnqueueResult): ManualSyncResponse {
  return {
    jobId: queuedJob.jobId,
    platform: queuedJob.platform,
    queuedAt: queuedJob.queuedAt,
    status: "QUEUED",
    storeId: queuedJob.storeId,
  };
}

function toManualSyncJobStatusResponse(
  jobStatus: SyncJobStatusResult,
): ManualSyncJobStatusResponse {
  return {
    ...(jobStatus.failedReason
      ? { failedReason: toSafeSyncFailureReason(jobStatus.failedReason) }
      : {}),
    ...(jobStatus.finishedAt ? { finishedAt: jobStatus.finishedAt } : {}),
    jobId: jobStatus.jobId,
    platform: jobStatus.platform,
    queuedAt: jobStatus.queuedAt,
    status: jobStatus.status,
    storeId: jobStatus.storeId,
  };
}

function toStoreSyncCursorStatuses(
  cursors: readonly CommerceSyncCursorRecord[],
): readonly StoreSyncCursorStatusResponse[] {
  const cursorByResource = new Map(cursors.map((cursor) => [cursor.resource, cursor]));

  return syncStatusResources.map((resource) => {
    const cursor = cursorByResource.get(resource);

    if (!cursor) {
      return {
        errorSummary: null,
        lastAttemptedSyncedAt: null,
        lastSuccessfulSyncedAt: null,
        resource,
        status: "NOT_STARTED",
      };
    }

    return {
      errorSummary: toSafeErrorSummary(cursor.errorMetadata),
      lastAttemptedSyncedAt: cursor.lastAttemptedSyncedAt,
      lastSuccessfulSyncedAt: cursor.lastSuccessfulSyncedAt,
      resource: cursor.resource,
      status: cursor.status,
    };
  });
}

function toSafeErrorSummary(
  errorMetadata: Readonly<Record<string, unknown>> | null,
): Readonly<Record<string, unknown>> | null {
  if (!errorMetadata) {
    return null;
  }

  const sanitized = sanitizeAuditMetadata(errorMetadata);

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function toStoreSyncJobStatusResponse(
  jobStatus: StoreSyncJobStatusResult,
): StoreSyncJobStatusResponse {
  return {
    ...(jobStatus.failedReason
      ? { failedReason: toSafeSyncFailureReason(jobStatus.failedReason) }
      : {}),
    ...(jobStatus.finishedAt ? { finishedAt: jobStatus.finishedAt } : {}),
    jobId: jobStatus.jobId,
    platform: jobStatus.platform,
    queuedAt: jobStatus.queuedAt,
    status: jobStatus.status,
    storeId: jobStatus.storeId,
  };
}

function toSafeSyncFailureReason(reason: string): string {
  const normalizedReason = reason.toLowerCase();

  if (normalizedReason.includes("auth")) {
    return "WooCommerce rejected the credentials. Check the read-only REST API key and secret.";
  }

  if (
    normalizedReason.includes("decrypt") ||
    normalizedReason.includes("encrypt") ||
    normalizedReason.includes("credential")
  ) {
    return "The worker could not decrypt stored credentials. Restart API and worker with the same encryption key.";
  }

  if (
    normalizedReason.includes("unreachable") ||
    normalizedReason.includes("url") ||
    normalizedReason.includes("timeout") ||
    normalizedReason.includes("timed out")
  ) {
    return "The WooCommerce store URL could not be reached. Check the URL and store availability.";
  }

  if (normalizedReason.includes("rate limit")) {
    return "WooCommerce rate limited the sync request. Retry synchronization shortly.";
  }

  return "WooCommerce sync failed. Please retry synchronization.";
}
