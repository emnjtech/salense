import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ShopifyRestClient,
  mapShopifyCategories,
  mapShopifyCustomer,
  mapShopifyInventorySnapshot,
  mapShopifyOrderCustomer,
  mapShopifyOrder,
  mapShopifyProduct,
  mapShopifyRefund,
  type NormalizedCommerceCustomer,
  type ShopifyCommerceMappingContext,
  type ShopifyRawCollection,
  type ShopifyRawCustomer,
  type ShopifyRawInventory,
  type ShopifyRawOrder,
  type ShopifyRawProduct,
  type ShopifyRawRefund,
  type ShopifyReadRequest,
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

export const SHOPIFY_REST_CLIENT = Symbol("SHOPIFY_REST_CLIENT");

export interface ShopifyReadClient {
  listInventory(request: ShopifyReadRequest): Promise<readonly ShopifyRawInventory[]>;
  listCollections(request: ShopifyReadRequest): Promise<readonly ShopifyRawCollection[]>;
  listCustomers(request: ShopifyReadRequest): Promise<readonly ShopifyRawCustomer[]>;
  listOrders(request: ShopifyReadRequest): Promise<readonly ShopifyRawOrder[]>;
  listProducts(request: ShopifyReadRequest): Promise<readonly ShopifyRawProduct[]>;
  listRefunds(request: ShopifyReadRequest): Promise<readonly ShopifyRawRefund[]>;
}

export type ShopifySyncResource =
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "categories"
  | "refunds";

export interface ShopifySyncOptions {
  readonly maxPages?: number;
  readonly pageSize?: number;
  readonly since?: Date;
  readonly triggeredAt?: Date;
}

export interface ShopifyResourceSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly persistence: WooCommerceCommercePersistenceResult;
  readonly readOnly: true;
  readonly resource: ShopifySyncResource;
  readonly status: "SUCCESS" | "ERROR";
  readonly syncedAt: Date;
}

export interface ShopifyFullSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly readOnly: true;
  readonly resources: readonly ShopifyResourceSyncResult[];
  readonly status: "SUCCESS" | "PARTIAL_FAILURE" | "ERROR";
  readonly syncedAt: Date;
}

interface ShopifySyncPrismaClient {
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
  readonly storeUrl: true;
}

interface ConnectedStoreSyncRecord {
  readonly accessTokenMetadata: unknown;
  readonly businessId: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly id: string;
  readonly platform: StorePlatform;
  readonly storeUrl: string | null;
}

interface ShopifyCredentialMetadata {
  readonly apiVersion?: string;
  readonly encryptedCredential?: EncryptedCredentialPlaceholder;
  readonly shopDomain?: string;
}

const connectedStoreSyncSelect = {
  accessTokenMetadata: true,
  businessId: true,
  connectionStatus: true,
  id: true,
  platform: true,
  storeUrl: true,
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
export class ShopifySyncService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AesCredentialEncryptionService)
    private readonly credentialEncryption: AesCredentialEncryptionService,
    @Inject(WooCommerceCommercePersistenceService)
    private readonly persistenceService: WooCommerceCommercePersistenceService,
    @Inject(SHOPIFY_REST_CLIENT) private readonly readClient: ShopifyReadClient,
    @Inject(CommerceSyncCursorService)
    private readonly syncCursorService: CommerceSyncCursorService,
  ) {}

  async syncOrders(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "orders", options, async (store, request) => {
      const rawOrders = await this.readClient.listOrders(request);
      const context = createMappingContext(store, options);
      const orders = rawOrders.map((order) => mapShopifyOrder(order, context));

      return this.persistenceService.persistCommerceData({ orders });
    });
  }

  async syncProducts(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "products", options, async (store, request) => {
      const rawProducts = await this.readClient.listProducts(request);
      const context = createMappingContext(store, options);
      const products = rawProducts.map((product) => mapShopifyProduct(product, context));

      return this.persistenceService.persistCommerceData({ products });
    });
  }

  async syncCustomers(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "customers", options, async (store, request) => {
      const context = createMappingContext(store, options);
      const rawCustomers = await this.readClient.listCustomers(request);
      const rawOrders = await this.readClient.listOrders(request);
      const customers = [
        ...rawCustomers.map((customer) => mapShopifyCustomer(customer, context)),
        ...rawOrders.map((order) => mapShopifyOrderCustomer(order, context)),
      ]
        .filter((customer): customer is NormalizedCommerceCustomer => customer !== null);

      return this.persistenceService.persistCommerceData({ customers });
    });
  }

  async syncInventory(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "inventory", options, async (store, request) => {
      const rawInventory = await this.readClient.listInventory(request);
      const context = createMappingContext(store, options);
      const inventorySnapshots = rawInventory.map((inventory) =>
        mapShopifyInventorySnapshot(inventory, {
          ...context,
          capturedAt: context.lastSyncedAt ?? context.importedAt ?? new Date(),
        }),
      );

      return this.persistenceService.persistCommerceData({ inventorySnapshots });
    });
  }

  async syncCategories(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "categories", options, async (store, request) => {
      const rawCollections = await this.readClient.listCollections(request);
      const categories = mapShopifyCategories(rawCollections, createMappingContext(store, options));

      return this.persistenceService.persistCommerceData({ categories });
    });
  }

  async syncRefunds(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "refunds", options, async (store, request) => {
      const rawRefunds = await this.readClient.listRefunds(request);
      const context = createMappingContext(store, options);
      const refunds = rawRefunds.map((refund) => mapShopifyRefund(refund, context));

      return this.persistenceService.persistCommerceData({ refunds });
    });
  }

  async syncAll(
    connectedStoreId: string,
    options: ShopifySyncOptions = {},
  ): Promise<ShopifyFullSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const resources: ShopifyResourceSyncResult[] = [];
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
    resource: ShopifySyncResource,
    options: ShopifySyncOptions,
    syncResource: (
      store: ConnectedStoreSyncRecord,
      request: ShopifyReadRequest,
    ) => Promise<WooCommerceCommercePersistenceResult>,
  ): Promise<ShopifyResourceSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const store = await this.loadConnectedShopifyStore(connectedStoreId);
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
        platform: StorePlatform.Shopify,
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
        platform: StorePlatform.Shopify,
        resource: cursorResource,
      });

      return {
        connectedStoreId,
        errors: [error instanceof Error ? error.message : "Shopify sync failed."],
        persistence: emptyPersistenceResult,
        readOnly: true,
        resource,
        status: "ERROR",
        syncedAt,
      };
    }
  }

  private async loadConnectedShopifyStore(
    connectedStoreId: string,
  ): Promise<ConnectedStoreSyncRecord> {
    const store = await this.prisma.connectedStore.findFirst({
      where: { id: connectedStoreId, platform: StorePlatform.Shopify },
      select: connectedStoreSyncSelect,
    });

    if (!store) {
      throw new NotFoundException("Shopify connected store could not be found.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Shopify store must be connected before synchronisation.");
    }

    return store;
  }

  private createReadRequest(
    store: ConnectedStoreSyncRecord,
    options: ShopifySyncOptions,
  ): ShopifyReadRequest {
    const accessTokenMetadata = asShopifyCredentialMetadata(store.accessTokenMetadata);
    if (!accessTokenMetadata.encryptedCredential) {
      throw new BadRequestException("Shopify access token is not configured for synchronisation.");
    }

    return withoutUndefined({
      accessToken: this.credentialEncryption.decrypt(accessTokenMetadata.encryptedCredential),
      apiVersion: accessTokenMetadata.apiVersion,
      maxPages: options.maxPages,
      pageSize: options.pageSize,
      shopDomain: accessTokenMetadata.shopDomain ?? store.storeUrl ?? "",
      since: options.since,
    }) as ShopifyReadRequest;
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

  private get prisma(): ShopifySyncPrismaClient {
    return this.prismaService.client as unknown as ShopifySyncPrismaClient;
  }
}

function toCursorResource(resource: ShopifySyncResource): CommerceSyncCursorResource {
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
  options: ShopifySyncOptions,
): ShopifyCommerceMappingContext {
  const syncedAt = options.triggeredAt ?? new Date();

  return {
    businessId: store.businessId,
    connectedStoreId: store.id,
    importedAt: syncedAt,
    lastSyncedAt: syncedAt,
  };
}

function asShopifyCredentialMetadata(value: unknown): ShopifyCredentialMetadata {
  return typeof value === "object" && value !== null ? (value as ShopifyCredentialMetadata) : {};
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function createShopifyRestClient(): ShopifyReadClient {
  return new ShopifyRestClient();
}
