import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AmazonSellerApiRegion,
  AmazonSellerRestClient,
  mapAmazonSellerCategories,
  mapAmazonSellerCustomer,
  mapAmazonSellerInventorySnapshot,
  mapAmazonSellerOrder,
  mapAmazonSellerProduct,
  mapAmazonSellerRefund,
  type AmazonSellerCommerceMappingContext,
  type AmazonSellerRawCatalogItem,
  type AmazonSellerRawInventorySummary,
  type AmazonSellerRawOrder,
  type AmazonSellerRawOrderItem,
  type AmazonSellerRawRefundEvent,
  type AmazonSellerReadRequest,
  type NormalizedCommerceCustomer,
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

export const AMAZON_SELLER_REST_CLIENT = Symbol("AMAZON_SELLER_REST_CLIENT");

export interface AmazonSellerReadClient {
  listInventory(request: AmazonSellerReadRequest): Promise<readonly AmazonSellerRawInventorySummary[]>;
  listOrderItems(
    request: AmazonSellerReadRequest,
    amazonOrderId: string,
  ): Promise<readonly AmazonSellerRawOrderItem[]>;
  listOrders(request: AmazonSellerReadRequest): Promise<readonly AmazonSellerRawOrder[]>;
  listProducts(request: AmazonSellerReadRequest): Promise<readonly AmazonSellerRawCatalogItem[]>;
  listRefunds(request: AmazonSellerReadRequest): Promise<readonly AmazonSellerRawRefundEvent[]>;
}

export type AmazonSellerSyncResource =
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "categories"
  | "refunds";

export interface AmazonSellerSyncOptions {
  readonly maxPages?: number;
  readonly pageSize?: number;
  readonly since?: Date;
  readonly triggeredAt?: Date;
}

export interface AmazonSellerResourceSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly persistence: WooCommerceCommercePersistenceResult;
  readonly readOnly: true;
  readonly resource: AmazonSellerSyncResource;
  readonly status: "SUCCESS" | "ERROR";
  readonly syncedAt: Date;
}

export interface AmazonSellerFullSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly readOnly: true;
  readonly resources: readonly AmazonSellerResourceSyncResult[];
  readonly status: "SUCCESS" | "PARTIAL_FAILURE" | "ERROR";
  readonly syncedAt: Date;
}

interface AmazonSellerSyncPrismaClient {
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

interface AmazonSellerCredentialMetadata {
  readonly encryptedCredential?: EncryptedCredentialPlaceholder;
  readonly marketplaceId?: string;
  readonly region?: AmazonSellerApiRegion;
  readonly sellerId?: string;
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
export class AmazonSellerSyncService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AesCredentialEncryptionService)
    private readonly credentialEncryption: AesCredentialEncryptionService,
    @Inject(WooCommerceCommercePersistenceService)
    private readonly persistenceService: WooCommerceCommercePersistenceService,
    @Inject(AMAZON_SELLER_REST_CLIENT) private readonly readClient: AmazonSellerReadClient,
    @Inject(CommerceSyncCursorService)
    private readonly syncCursorService: CommerceSyncCursorService,
  ) {}

  async syncOrders(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "orders", options, async (store, request) => {
      const rawOrders = await this.readClient.listOrders(request);
      const context = createMappingContext(store, options);
      const orders = await Promise.all(
        rawOrders.map(async (order) =>
          mapAmazonSellerOrder(order, await this.readClient.listOrderItems(request, order.AmazonOrderId), context),
        ),
      );

      return this.persistenceService.persistCommerceData({ orders });
    });
  }

  async syncProducts(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "products", options, async (store, request) => {
      const rawProducts = await this.readClient.listProducts(request);
      const context = createMappingContext(store, options);
      const products = rawProducts.map((product) => mapAmazonSellerProduct(product, context));

      return this.persistenceService.persistCommerceData({ products });
    });
  }

  async syncCustomers(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "customers", options, async (store, request) => {
      const rawOrders = await this.readClient.listOrders(request);
      const context = createMappingContext(store, options);
      const customers = rawOrders
        .map((order) => mapAmazonSellerCustomer(order, context))
        .filter((customer): customer is NormalizedCommerceCustomer => customer !== null);

      return this.persistenceService.persistCommerceData({ customers });
    });
  }

  async syncInventory(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "inventory", options, async (store, request) => {
      const rawInventory = await this.readClient.listInventory(request);
      const context = createMappingContext(store, options);
      const inventorySnapshots = rawInventory.map((inventory) =>
        mapAmazonSellerInventorySnapshot(inventory, {
          ...context,
          capturedAt: context.lastSyncedAt ?? context.importedAt ?? new Date(),
        }),
      );

      return this.persistenceService.persistCommerceData({ inventorySnapshots });
    });
  }

  async syncCategories(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "categories", options, async (store, request) => {
      const rawProducts = await this.readClient.listProducts(request);
      const categories = mapAmazonSellerCategories(rawProducts, createMappingContext(store, options));

      return this.persistenceService.persistCommerceData({ categories });
    });
  }

  async syncRefunds(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "refunds", options, async (store, request) => {
      const rawRefunds = await this.readClient.listRefunds(request);
      const context = createMappingContext(store, options);
      const refunds = rawRefunds.map((refund) => mapAmazonSellerRefund(refund, context));

      return this.persistenceService.persistCommerceData({ refunds });
    });
  }

  async syncAll(
    connectedStoreId: string,
    options: AmazonSellerSyncOptions = {},
  ): Promise<AmazonSellerFullSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const resources: AmazonSellerResourceSyncResult[] = [];
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
      status: errors.length === 0 ? "SUCCESS" : resources.some((resource) => resource.status === "SUCCESS") ? "PARTIAL_FAILURE" : "ERROR",
      syncedAt,
    };
  }

  private async runResourceSync(
    connectedStoreId: string,
    resource: AmazonSellerSyncResource,
    options: AmazonSellerSyncOptions,
    syncResource: (
      store: ConnectedStoreSyncRecord,
      request: AmazonSellerReadRequest,
    ) => Promise<WooCommerceCommercePersistenceResult>,
  ): Promise<AmazonSellerResourceSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const store = await this.loadConnectedAmazonSellerStore(connectedStoreId);
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
        platform: StorePlatform.AmazonSeller,
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
        platform: StorePlatform.AmazonSeller,
        resource: cursorResource,
      });

      return {
        connectedStoreId,
        errors: [error instanceof Error ? error.message : "Amazon Seller sync failed."],
        persistence: emptyPersistenceResult,
        readOnly: true,
        resource,
        status: "ERROR",
        syncedAt,
      };
    }
  }

  private async loadConnectedAmazonSellerStore(
    connectedStoreId: string,
  ): Promise<ConnectedStoreSyncRecord> {
    const store = await this.prisma.connectedStore.findFirst({
      where: { id: connectedStoreId, platform: StorePlatform.AmazonSeller },
      select: connectedStoreSyncSelect,
    });

    if (!store) {
      throw new NotFoundException("Amazon Seller connected store could not be found.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Amazon Seller store must be connected before synchronisation.");
    }

    return store;
  }

  private createReadRequest(
    store: ConnectedStoreSyncRecord,
    options: AmazonSellerSyncOptions,
  ): AmazonSellerReadRequest {
    const accessTokenMetadata = asAmazonSellerCredentialMetadata(store.accessTokenMetadata);
    const refreshTokenMetadata = asAmazonSellerCredentialMetadata(store.refreshTokenMetadata);

    if (!accessTokenMetadata.encryptedCredential) {
      throw new BadRequestException("Amazon Seller access token is not configured for synchronisation.");
    }

    return withoutUndefined({
      accessToken: this.credentialEncryption.decrypt(accessTokenMetadata.encryptedCredential),
      marketplaceId: accessTokenMetadata.marketplaceId,
      maxPages: options.maxPages,
      pageSize: options.pageSize,
      refreshToken: refreshTokenMetadata.encryptedCredential
        ? this.credentialEncryption.decrypt(refreshTokenMetadata.encryptedCredential)
        : undefined,
      region: accessTokenMetadata.region ?? AmazonSellerApiRegion.Europe,
      sellerId: accessTokenMetadata.sellerId,
      since: options.since,
    }) as AmazonSellerReadRequest;
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

  private get prisma(): AmazonSellerSyncPrismaClient {
    return this.prismaService.client as unknown as AmazonSellerSyncPrismaClient;
  }
}

function toCursorResource(resource: AmazonSellerSyncResource): CommerceSyncCursorResource {
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
  options: AmazonSellerSyncOptions,
): AmazonSellerCommerceMappingContext {
  const syncedAt = options.triggeredAt ?? new Date();

  return {
    businessId: store.businessId,
    connectedStoreId: store.id,
    importedAt: syncedAt,
    lastSyncedAt: syncedAt,
  };
}

function asAmazonSellerCredentialMetadata(value: unknown): AmazonSellerCredentialMetadata {
  return typeof value === "object" && value !== null ? (value as AmazonSellerCredentialMetadata) : {};
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function createAmazonSellerRestClient(): AmazonSellerReadClient {
  return new AmazonSellerRestClient();
}
