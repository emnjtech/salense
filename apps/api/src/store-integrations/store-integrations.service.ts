import {
  INTEGRATION_FACTORY,
  IntegrationNotImplementedError,
  IntegrationPlatform,
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
  NotImplementedException,
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
  WooCommerceSyncJobName,
  type SyncJobEnqueueResult,
  type SyncJobStatusResult,
  type SyncQueuePort,
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
        | ConnectedStoreActionSelect;
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
  readonly disconnectedAt?: Date | null;
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
      where: { business: { ownerId: userId } },
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

    if (request.platform !== StorePlatform.WooCommerce) {
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

    const credentialConfiguration = this.createCredentialConfiguration(request);
    const connectedStore = await prisma.connectedStore.create({
      data: {
        businessId: business.id,
        platform: request.platform,
        storeName: request.storeName.trim(),
        storeUrl,
        region,
        connectionStatus: StoreConnectionStatus.PendingValidation,
        accessTokenHash: credentialConfiguration.accessTokenHash ?? "",
        accessTokenMetadata: credentialConfiguration.accessTokenMetadata ?? {},
        refreshTokenHash: credentialConfiguration.refreshTokenHash ?? "",
        refreshTokenMetadata: credentialConfiguration.refreshTokenMetadata ?? {},
      },
      select: connectedStoreSelect,
    });

    await this.recordStoreIntegrationAuditEvent({
      action: AuditAction.WooCommerceConnectionCreated,
      businessId: business.id,
      metadata: {
        apiVersion: credentialConfiguration.apiVersion,
        connectionStatus: connectedStore.connectionStatus,
        storeUrl,
      },
      result: AuditLogResult.Success,
      storeId: connectedStore.id,
      userId,
    });

    const provider = this.integrationFactory.getProvider(IntegrationPlatform.WooCommerce);

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
        }),
      );
      const validatedStore = await prisma.connectedStore.update({
        where: { id: connectedStore.id },
        data: { connectionStatus: StoreConnectionStatus.Connected },
        select: connectedStoreSelect,
      });

      await this.recordStoreIntegrationAuditEvent({
        action: AuditAction.WooCommerceConnectionValidationSucceeded,
        businessId: business.id,
        metadata: {
          connectionStatus: validatedStore.connectionStatus,
          storeUrl,
        },
        result: AuditLogResult.Success,
        storeId: connectedStore.id,
        userId,
      });

      return toConnectedStoreResponse(validatedStore as ConnectedStoreRecord);
    } catch (error) {
      const failedStore = await prisma.connectedStore.update({
        where: { id: connectedStore.id },
        data: { connectionStatus: StoreConnectionStatus.Error },
        select: connectedStoreSelect,
      });

      await this.recordStoreIntegrationAuditEvent({
        action: AuditAction.WooCommerceConnectionValidationFailed,
        businessId: business.id,
        metadata: {
          connectionStatus: failedStore.connectionStatus,
          errorName: error instanceof Error ? error.name : "UnknownError",
          storeUrl,
        },
        result: AuditLogResult.Failure,
        storeId: connectedStore.id,
        userId,
      });

      return toConnectedStoreResponse(failedStore as ConnectedStoreRecord);
    }
  }

  private createCredentialConfiguration(
    request: PrepareStoreConnectionRequestDto,
  ): Pick<
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
  > {
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

    if (store.platform !== StorePlatform.WooCommerce) {
      throw new NotImplementedException(
        "Disconnect is currently implemented for WooCommerce stores only.",
      );
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

  async requestManualSync(userId: string, request: StoreActionRequestDto): Promise<ManualSyncResponse> {
    const store = await this.assertStoreBelongsToUser(userId, request.storeId);

    if (store.platform !== StorePlatform.WooCommerce) {
      throw new BadRequestException("Manual sync is currently available for WooCommerce stores only.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Store must be connected before manual synchronisation.");
    }

    const queuedAt = new Date();
    const queuedJob = await this.syncQueue.enqueueWooCommerceSyncJob(
      WooCommerceSyncJobName.ManualFullSync,
      {
        platform: StorePlatform.WooCommerce,
        queuedAt: queuedAt.toISOString(),
        requestedByUserId: userId,
        resource: "all",
        storeId: store.id,
      },
    );

    await this.recordStoreIntegrationAuditEvent({
      action: AuditAction.ManualSyncJobQueued,
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

  async getStoreSyncStatus(
    userId: string,
    storeId: string,
  ): Promise<StoreSyncStatusResponse> {
    const store = await this.assertStoreBelongsToUser(userId, storeId);

    if (store.platform !== StorePlatform.WooCommerce) {
      throw new BadRequestException("Sync status is currently available for WooCommerce stores only.");
    }

    const prisma = this.prismaService.client as unknown as StoreIntegrationsPrismaClient;
    const cursors = await prisma.commerceSyncCursor.findMany({
      where: { connectedStoreId: store.id },
      orderBy: { resource: "asc" },
      select: commerceSyncCursorSelect,
    });
    const jobs = await this.getSafeStoreJobStatuses(store.id);

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
    readonly businessId: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly result: AuditLogResult;
    readonly storeId: string;
    readonly userId: string;
  }): Promise<void> {
    await this.auditLogService.record({
      action: input.action,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: input.storeId,
      businessId: input.businessId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      result: input.result,
      userId: input.userId,
    });
  }

  private async getSafeStoreJobStatuses(
    storeId: string,
  ): Promise<readonly StoreSyncJobStatusResponse[]> {
    try {
      const jobs = await this.syncQueue.getWooCommerceStoreJobStatuses(storeId);

      return jobs.map(toStoreSyncJobStatusResponse);
    } catch {
      return [];
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

function hashCredentialPlaceholder(value: string): string {
  return createHash("sha256").update(value.trim(), "utf8").digest("hex");
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
    ...(jobStatus.failedReason ? { failedReason: jobStatus.failedReason } : {}),
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
  jobStatus: StoreSyncJobStatusResponse,
): StoreSyncJobStatusResponse {
  return {
    ...(jobStatus.failedReason ? { failedReason: jobStatus.failedReason } : {}),
    ...(jobStatus.finishedAt ? { finishedAt: jobStatus.finishedAt } : {}),
    jobId: jobStatus.jobId,
    platform: jobStatus.platform,
    queuedAt: jobStatus.queuedAt,
    status: jobStatus.status,
    storeId: jobStatus.storeId,
  };
}
