import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  mapWooCommerceCategory,
  mapWooCommerceCustomer,
  mapWooCommerceInventorySnapshot,
  mapWooCommerceOrder,
  mapWooCommerceProduct,
  mapWooCommerceRefund,
  WooCommerceApiVersion,
  WooCommerceRestClient,
  type NormalizedCommerceRefund,
  type WooCommerceCommerceMappingContext,
  type WooCommerceRawCustomer,
  type WooCommerceRawInventoryProduct,
  type WooCommerceRawOrder,
  type WooCommerceRawProduct,
  type WooCommerceRawProductCategory,
  type WooCommerceRawRefund,
  type WooCommerceReadRequest,
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

export const WOOCOMMERCE_REST_CLIENT = Symbol("WOOCOMMERCE_REST_CLIENT");

export interface WooCommerceReadClient {
  listOrders(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawOrder[]>;
  listProducts(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawProduct[]>;
  listCustomers(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawCustomer[]>;
  listInventoryProducts(
    request: WooCommerceReadRequest,
  ): Promise<readonly WooCommerceRawInventoryProduct[]>;
  listProductCategories(
    request: WooCommerceReadRequest,
  ): Promise<readonly WooCommerceRawProductCategory[]>;
  listRefunds(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawRefund[]>;
}

export type WooCommerceSyncResource =
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "categories"
  | "refunds";

export interface WooCommerceSyncOptions {
  readonly maxPages?: number;
  readonly perPage?: number;
  readonly since?: Date;
  readonly triggeredAt?: Date;
}

export interface WooCommerceResourceSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly persistence: WooCommerceCommercePersistenceResult;
  readonly readOnly: true;
  readonly resource: WooCommerceSyncResource;
  readonly status: "SUCCESS" | "ERROR";
  readonly syncedAt: Date;
}

export interface WooCommerceFullSyncResult {
  readonly connectedStoreId: string;
  readonly errors: readonly string[];
  readonly readOnly: true;
  readonly resources: readonly WooCommerceResourceSyncResult[];
  readonly status: "SUCCESS" | "PARTIAL_FAILURE" | "ERROR";
  readonly syncedAt: Date;
}

interface WooCommerceSyncPrismaClient {
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
  readonly storeUrl: true;
}

interface ConnectedStoreSyncRecord {
  readonly accessTokenMetadata: unknown;
  readonly businessId: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly id: string;
  readonly platform: StorePlatform;
  readonly refreshTokenMetadata: unknown;
  readonly storeUrl: string | null;
}

interface WooCommerceCredentialMetadata {
  readonly apiVersion?: WooCommerceApiVersion;
  readonly encryptedCredential?: EncryptedCredentialPlaceholder;
}

const connectedStoreSyncSelect = {
  accessTokenMetadata: true,
  businessId: true,
  connectionStatus: true,
  id: true,
  platform: true,
  refreshTokenMetadata: true,
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
export class WooCommerceSyncService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AesCredentialEncryptionService)
    private readonly credentialEncryption: AesCredentialEncryptionService,
    @Inject(WooCommerceCommercePersistenceService)
    private readonly persistenceService: WooCommerceCommercePersistenceService,
    @Inject(WOOCOMMERCE_REST_CLIENT) private readonly readClient: WooCommerceReadClient,
    @Inject(CommerceSyncCursorService)
    private readonly syncCursorService: CommerceSyncCursorService,
  ) {}

  async syncOrders(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "orders", options, async (store, request) => {
      const rawOrders = await this.readClient.listOrders(request);
      const context = createMappingContext(store, options);
      const orders = rawOrders.map((order) => mapWooCommerceOrder(order, context));
      const persistence = await this.persistenceService.persistCommerceData({ orders });

      return persistence;
    });
  }

  async syncProducts(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "products", options, async (store, request) => {
      const rawProducts = await this.readClient.listProducts(request);
      const context = createMappingContext(store, options);
      const products = rawProducts.map((product) => mapWooCommerceProduct(product, context));
      const persistence = await this.persistenceService.persistCommerceData({ products });

      return persistence;
    });
  }

  async syncCustomers(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "customers", options, async (store, request) => {
      const rawCustomers = await this.readClient.listCustomers(request);
      const context = createMappingContext(store, options);
      const customers = rawCustomers.map((customer) => mapWooCommerceCustomer(customer, context));
      const persistence = await this.persistenceService.persistCommerceData({ customers });

      return persistence;
    });
  }

  async syncInventory(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "inventory", options, async (store, request) => {
      const rawInventoryProducts = await this.readClient.listInventoryProducts(request);
      const context = createMappingContext(store, options);
      const inventorySnapshots = rawInventoryProducts.map((product) =>
        mapWooCommerceInventorySnapshot(product, {
          ...context,
          capturedAt: context.lastSyncedAt ?? context.importedAt ?? new Date(),
        }),
      );
      const persistence = await this.persistenceService.persistCommerceData({ inventorySnapshots });

      return persistence;
    });
  }

  async syncCategories(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "categories", options, async (store, request) => {
      const rawCategories = await this.readClient.listProductCategories(request);
      const context = createMappingContext(store, options);
      const categories = rawCategories.map((category) => mapWooCommerceCategory(category, context));
      const persistence = await this.persistenceService.persistCommerceData({ categories });

      return persistence;
    });
  }

  async syncRefunds(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceResourceSyncResult> {
    return this.runResourceSync(connectedStoreId, "refunds", options, async (store, request) => {
      const rawRefunds = await this.readClient.listRefunds(request);
      const context = createMappingContext(store, options);
      const refunds: readonly NormalizedCommerceRefund[] = rawRefunds.map((refund) =>
        mapWooCommerceRefund(refund, context),
      );
      const persistence = await this.persistenceService.persistCommerceData({ refunds });

      return persistence;
    });
  }

  async syncAll(
    connectedStoreId: string,
    options: WooCommerceSyncOptions = {},
  ): Promise<WooCommerceFullSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const resources: WooCommerceResourceSyncResult[] = [];
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
    resource: WooCommerceSyncResource,
    options: WooCommerceSyncOptions,
    syncResource: (
      store: ConnectedStoreSyncRecord,
      request: WooCommerceReadRequest,
    ) => Promise<WooCommerceCommercePersistenceResult>,
  ): Promise<WooCommerceResourceSyncResult> {
    const syncedAt = options.triggeredAt ?? new Date();
    const store = await this.loadConnectedWooCommerceStore(connectedStoreId);
    const cursorResource = toCursorResource(resource);
    const cursor = await this.syncCursorService.getCursor(connectedStoreId, cursorResource);
    const cursorSince = supportsIncrementalCursor(resource)
      ? options.since ?? cursor?.lastSuccessfulSyncedAt ?? undefined
      : undefined;
    const effectiveOptions: WooCommerceSyncOptions = {
      ...options,
      ...(cursorSince ? { since: cursorSince } : {}),
    };
    const request = this.createReadRequest(store, effectiveOptions);

    try {
      const persistence = await syncResource(store, request);
      await this.updateStoreLastSynchronisedAt(connectedStoreId, syncedAt);
      await this.syncCursorService.recordSuccess({
        businessId: store.businessId,
        connectedStoreId,
        platform: StorePlatform.WooCommerce,
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
        platform: StorePlatform.WooCommerce,
        resource: cursorResource,
      });

      return {
        connectedStoreId,
        errors: [error instanceof Error ? error.message : "WooCommerce sync failed."],
        persistence: emptyPersistenceResult,
        readOnly: true,
        resource,
        status: "ERROR",
        syncedAt,
      };
    }
  }

  private async loadConnectedWooCommerceStore(
    connectedStoreId: string,
  ): Promise<ConnectedStoreSyncRecord> {
    const store = await this.prisma.connectedStore.findFirst({
      where: { id: connectedStoreId, platform: StorePlatform.WooCommerce },
      select: connectedStoreSyncSelect,
    });

    if (!store) {
      throw new NotFoundException("WooCommerce connected store could not be found.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("WooCommerce store must be connected before synchronisation.");
    }

    if (!store.storeUrl) {
      throw new BadRequestException("WooCommerce store URL is required for synchronisation.");
    }

    return store;
  }

  private createReadRequest(
    store: ConnectedStoreSyncRecord,
    options: WooCommerceSyncOptions,
  ): WooCommerceReadRequest {
    const accessTokenMetadata = asWooCommerceCredentialMetadata(store.accessTokenMetadata);
    const refreshTokenMetadata = asWooCommerceCredentialMetadata(store.refreshTokenMetadata);

    if (!accessTokenMetadata.encryptedCredential || !refreshTokenMetadata.encryptedCredential) {
      throw new BadRequestException("WooCommerce credentials are not configured for synchronisation.");
    }

    return withoutUndefined({
      apiVersion: accessTokenMetadata.apiVersion ?? WooCommerceApiVersion.WcV3,
      consumerKey: this.credentialEncryption.decrypt(accessTokenMetadata.encryptedCredential),
      consumerSecret: this.credentialEncryption.decrypt(refreshTokenMetadata.encryptedCredential),
      maxPages: options.maxPages,
      perPage: options.perPage,
      since: options.since,
      storeUrl: store.storeUrl ?? "",
    }) as WooCommerceReadRequest;
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

  private get prisma(): WooCommerceSyncPrismaClient {
    return this.prismaService.client as unknown as WooCommerceSyncPrismaClient;
  }
}

function toCursorResource(resource: WooCommerceSyncResource): CommerceSyncCursorResource {
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

function supportsIncrementalCursor(resource: WooCommerceSyncResource): boolean {
  return resource !== "categories";
}

function createMappingContext(
  store: ConnectedStoreSyncRecord,
  options: WooCommerceSyncOptions,
): WooCommerceCommerceMappingContext {
  const syncedAt = options.triggeredAt ?? new Date();

  return {
    businessId: store.businessId,
    connectedStoreId: store.id,
    importedAt: syncedAt,
    lastSyncedAt: syncedAt,
  };
}

function asWooCommerceCredentialMetadata(value: unknown): WooCommerceCredentialMetadata {
  return typeof value === "object" && value !== null ? (value as WooCommerceCredentialMetadata) : {};
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function createWooCommerceRestClient(): WooCommerceReadClient {
  return new WooCommerceRestClient();
}
