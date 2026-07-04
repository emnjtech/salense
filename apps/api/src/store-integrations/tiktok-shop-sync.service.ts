import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  TikTokShopApiRegion,
  TikTokShopRestClient,
  mapTikTokShopCategories,
  mapTikTokShopCustomer,
  mapTikTokShopInventorySnapshot,
  mapTikTokShopOrder,
  mapTikTokShopProduct,
  mapTikTokShopRefund,
  type NormalizedCommerceCustomer,
  type TikTokShopCommerceMappingContext,
  type TikTokShopRawInventory,
  type TikTokShopRawOrder,
  type TikTokShopRawProduct,
  type TikTokShopRawRefund,
  type TikTokShopReadRequest,
} from "@salense/integrations";
import { PrismaService } from "../database/prisma.service.js";
import {
  AesCredentialEncryptionService,
  type EncryptedCredentialPlaceholder,
} from "./security/credential-encryption.service.js";
import { CommerceSyncCursorService } from "./sync-cursors/commerce-sync-cursor.service.js";
import { CommerceSyncCursorResource } from "./sync-cursors/commerce-sync-cursor.types.js";
import { StoreConnectionStatus } from "./types/store-connection-status.enum.js";
import { StorePlatform } from "./types/store-platform.enum.js";
import {
  WooCommerceCommercePersistenceService,
  type WooCommerceCommercePersistenceResult,
} from "./woocommerce-commerce-persistence.service.js";

export const TIKTOK_SHOP_REST_CLIENT = Symbol("TIKTOK_SHOP_REST_CLIENT");

export interface TikTokShopReadClient {
  listInventory(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawInventory[]>;
  listOrders(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawOrder[]>;
  listProducts(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawProduct[]>;
  listRefunds(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawRefund[]>;
}

export type TikTokShopSyncResource =
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "categories"
  | "refunds";

export interface TikTokShopSyncOptions {
  readonly maxPages?: number;
  readonly pageSize?: number;
  readonly since?: Date;
  readonly triggeredAt?: Date;
}

export interface TikTokShopResourceSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly persistence: WooCommerceCommercePersistenceResult;
  readonly readOnly: true;
  readonly resource: TikTokShopSyncResource;
  readonly status: "SUCCESS" | "ERROR";
  readonly syncedAt: Date;
}

export interface TikTokShopFullSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly readOnly: true;
  readonly resources: readonly TikTokShopResourceSyncResult[];
  readonly status: "SUCCESS" | "PARTIAL_FAILURE" | "ERROR";
  readonly syncedAt: Date;
}

interface TikTokShopSyncPrismaClient {
  readonly connectedStore: {
    findFirst(args: {
      readonly where: { readonly id: string; readonly platform: StorePlatform };
      readonly select: ConnectedStoreSyncSelect;
    }): Promise<ConnectedStoreSyncRecord | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: { readonly lastSynchronisedAt: Date };
    }): Promise<unknown>;
  };
}

interface ConnectedStoreSyncSelect {
  readonly accessTokenMetadata: true;
  readonly businessId: true;
  readonly connectionStatus: true;
  readonly id: true;
  readonly platform: true;
  readonly refreshTokenMetadata: true;
  readonly region: true;
}

interface ConnectedStoreSyncRecord {
  readonly accessTokenMetadata: unknown;
  readonly businessId: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly id: string;
  readonly platform: StorePlatform;
  readonly refreshTokenMetadata: unknown;
  readonly region: string | null;
}

interface TikTokShopCredentialMetadata {
  readonly encryptedCredential?: EncryptedCredentialPlaceholder;
  readonly region?: TikTokShopApiRegion;
  readonly shopCipher?: string;
  readonly shopId?: string;
}

const connectedStoreSyncSelect = {
  accessTokenMetadata: true,
  businessId: true,
  connectionStatus: true,
  id: true,
  platform: true,
  refreshTokenMetadata: true,
  region: true,
} satisfies ConnectedStoreSyncSelect;

const emptyPersistenceResult = {
  categories: 0,
  customers: 0,
  inventorySnapshots: 0,
  orderItems: 0,
  orders: 0,
  products: 0,
  refunds: 0,
} satisfies WooCommerceCommercePersistenceResult;

@Injectable()
export class TikTokShopSyncService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AesCredentialEncryptionService)
    private readonly credentialEncryption: AesCredentialEncryptionService,
    @Inject(WooCommerceCommercePersistenceService)
    private readonly persistenceService: WooCommerceCommercePersistenceService,
    @Inject(TIKTOK_SHOP_REST_CLIENT) private readonly readClient: TikTokShopReadClient,
    @Inject(CommerceSyncCursorService)
    private readonly syncCursorService: CommerceSyncCursorService,
  ) {}

  async syncOrders(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "orders", options, async (store, request) => {
      const rawOrders = await this.readClient.listOrders(request);
      const context = createMappingContext(store, options);
      const orders = rawOrders.map((order) => mapTikTokShopOrder(order, context));

      return this.persistenceService.persistCommerceData({ orders });
    });
  }

  async syncProducts(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "products", options, async (store, request) => {
      const rawProducts = await this.readClient.listProducts(request);
      const context = createMappingContext(store, options);
      const products = rawProducts.map((product) => mapTikTokShopProduct(product, context));

      return this.persistenceService.persistCommerceData({ products });
    });
  }

  async syncCustomers(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "customers", options, async (store, request) => {
      const rawOrders = await this.readClient.listOrders(request);
      const context = createMappingContext(store, options);
      const customers = rawOrders
        .map((order) => mapTikTokShopCustomer(order, context))
        .filter((customer): customer is NormalizedCommerceCustomer => customer !== null);

      return this.persistenceService.persistCommerceData({ customers });
    });
  }

  async syncInventory(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "inventory", options, async (store, request) => {
      const rawInventory = await this.readClient.listInventory(request);
      const context = createMappingContext(store, options);
      const inventorySnapshots = rawInventory.map((inventory) =>
        mapTikTokShopInventorySnapshot(inventory, {
          ...context,
          capturedAt: context.lastSyncedAt ?? context.importedAt ?? new Date(),
        }),
      );

      return this.persistenceService.persistCommerceData({ inventorySnapshots });
    });
  }

  async syncCategories(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "categories", options, async (store, request) => {
      const rawProducts = await this.readClient.listProducts(request);
      const categories = mapTikTokShopCategories(rawProducts, createMappingContext(store, options));

      return this.persistenceService.persistCommerceData({ categories });
    });
  }

  async syncRefunds(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "refunds", options, async (store, request) => {
      const rawRefunds = await this.readClient.listRefunds(request);
      const context = createMappingContext(store, options);
      const refunds = rawRefunds.map((refund) => mapTikTokShopRefund(refund, context));

      return this.persistenceService.persistCommerceData({ refunds });
    });
  }

  async syncAll(
    connectedStoreId: string,
    options: TikTokShopSyncOptions = {},
  ): Promise<TikTokShopFullSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const resources: TikTokShopResourceSyncResult[] = [];
    const errors: string[] = [];

    for (const syncResource of [
      this.syncOrders.bind(this),
      this.syncProducts.bind(this),
      this.syncCustomers.bind(this),
      this.syncInventory.bind(this),
      this.syncCategories.bind(this),
      this.syncRefunds.bind(this),
    ]) {
      const result = await syncResource(connectedStoreId, { ...options, triggeredAt: syncedAt });
      resources.push(result);
      errors.push(...result.errors);
    }

    return {
      connectedStoreId,
      errors,
      readOnly: true,
      resources,
      status:
        errors.length === 0
          ? "SUCCESS"
          : resources.some((resource) => resource.status === "SUCCESS")
            ? "PARTIAL_FAILURE"
            : "ERROR",
      syncedAt,
    };
  }

  private async runResourceSync(
    connectedStoreId: string,
    resource: TikTokShopSyncResource,
    options: TikTokShopSyncOptions,
    syncResource: (
      store: ConnectedStoreSyncRecord,
      request: TikTokShopReadRequest,
    ) => Promise<WooCommerceCommercePersistenceResult>,
  ): Promise<TikTokShopResourceSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const store = await this.loadConnectedTikTokShopStore(connectedStoreId);
    const cursorResource = toCursorResource(resource);
    const cursor = await this.syncCursorService.getCursor(connectedStoreId, cursorResource);
    const cursorSince = options.since ?? cursor?.lastSuccessfulSyncedAt ?? undefined;
    const request = this.createReadRequest(store, {
      ...options,
      ...(cursorSince ? { since: cursorSince } : {}),
    });

    try {
      const persistence = await syncResource(store, request);
      await this.updateStoreLastSynchronisedAt(connectedStoreId, syncedAt);
      await this.syncCursorService.recordSuccess({
        businessId: store.businessId,
        connectedStoreId,
        platform: StorePlatform.TikTokShop,
        resource: cursorResource,
        syncedAt,
      });

      return {
        connectedStoreId,
        errors: [],
        persistence,
        readOnly: true,
        resource,
        status: "SUCCESS",
        syncedAt,
      };
    } catch (error) {
      await this.syncCursorService.recordFailure({
        attemptedAt: syncedAt,
        businessId: store.businessId,
        connectedStoreId,
        error,
        platform: StorePlatform.TikTokShop,
        resource: cursorResource,
      });

      return {
        connectedStoreId,
        errors: [error instanceof Error ? error.message : "TikTok Shop sync failed."],
        persistence: emptyPersistenceResult,
        readOnly: true,
        resource,
        status: "ERROR",
        syncedAt,
      };
    }
  }

  private async loadConnectedTikTokShopStore(
    connectedStoreId: string,
  ): Promise<ConnectedStoreSyncRecord> {
    const store = await this.prisma.connectedStore.findFirst({
      where: { id: connectedStoreId, platform: StorePlatform.TikTokShop },
      select: connectedStoreSyncSelect,
    });

    if (!store) {
      throw new NotFoundException("TikTok Shop connected store could not be found.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("TikTok Shop store must be connected before synchronisation.");
    }

    return store;
  }

  private createReadRequest(
    store: ConnectedStoreSyncRecord,
    options: TikTokShopSyncOptions,
  ): TikTokShopReadRequest {
    const accessTokenMetadata = asTikTokShopCredentialMetadata(store.accessTokenMetadata);
    const refreshTokenMetadata = asTikTokShopCredentialMetadata(store.refreshTokenMetadata);

    if (!accessTokenMetadata.encryptedCredential) {
      throw new BadRequestException("TikTok Shop access token is not configured for synchronisation.");
    }

    return withoutUndefined({
      accessToken: this.credentialEncryption.decrypt(accessTokenMetadata.encryptedCredential),
      maxPages: options.maxPages,
      pageSize: options.pageSize,
      refreshToken: refreshTokenMetadata.encryptedCredential
        ? this.credentialEncryption.decrypt(refreshTokenMetadata.encryptedCredential)
        : undefined,
      region: accessTokenMetadata.region ?? TikTokShopApiRegion.Europe,
      shopCipher: accessTokenMetadata.shopCipher,
      shopId: accessTokenMetadata.shopId,
      since: options.since,
    }) as TikTokShopReadRequest;
  }

  private async updateStoreLastSynchronisedAt(
    connectedStoreId: string,
    lastSynchronisedAt: Date,
  ): Promise<void> {
    await this.prisma.connectedStore.update({
      where: { id: connectedStoreId },
      data: { lastSynchronisedAt },
    });
  }

  private get prisma(): TikTokShopSyncPrismaClient {
    return this.prismaService.client as unknown as TikTokShopSyncPrismaClient;
  }
}

function toCursorResource(resource: TikTokShopSyncResource): CommerceSyncCursorResource {
  switch (resource) {
    case "orders":
      return CommerceSyncCursorResource.Orders;
    case "products":
      return CommerceSyncCursorResource.Products;
    case "customers":
      return CommerceSyncCursorResource.Customers;
    case "inventory":
      return CommerceSyncCursorResource.Inventory;
    case "categories":
      return CommerceSyncCursorResource.Categories;
    case "refunds":
      return CommerceSyncCursorResource.Refunds;
  }
}

function createMappingContext(
  store: ConnectedStoreSyncRecord,
  options: TikTokShopSyncOptions,
): TikTokShopCommerceMappingContext {
  const syncedAt = options.triggeredAt ?? new Date();

  return {
    businessId: store.businessId,
    connectedStoreId: store.id,
    importedAt: syncedAt,
    lastSyncedAt: syncedAt,
  };
}

function asTikTokShopCredentialMetadata(value: unknown): TikTokShopCredentialMetadata {
  return typeof value === "object" && value !== null ? (value as TikTokShopCredentialMetadata) : {};
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function createTikTokShopRestClient(): TikTokShopReadClient {
  return new TikTokShopRestClient();
}
