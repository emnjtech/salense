import { Inject, Injectable } from "@nestjs/common";
import type {
  NormalizedCommerceCategory,
  NormalizedCommerceCustomer,
  NormalizedCommerceInventorySnapshot,
  NormalizedCommerceOrder,
  NormalizedCommerceOrderItem,
  NormalizedCommerceProduct,
  NormalizedCommerceRefund,
  NormalizedWooCommerceOrderTree,
} from "@salense/integrations";
import { PrismaService } from "../database/prisma.service.js";

interface WooCommerceCommercePersistencePrismaClient {
  readonly connectedStore: {
    update(args: {
      readonly where: { readonly id: string };
      readonly data: { readonly lastSynchronisedAt: Date };
    }): Promise<unknown>;
  };
  readonly commerceOrder: {
    findUnique(args: {
      readonly where: {
        readonly connectedStoreId_platformOrderId: {
          readonly connectedStoreId: string;
          readonly platformOrderId: string;
        };
      };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_platformOrderId: {
          readonly connectedStoreId: string;
          readonly platformOrderId: string;
        };
      };
      readonly create: CommerceOrderCreateData;
      readonly update: CommerceOrderUpdateData;
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string }>;
  };
  readonly commerceOrderItem: {
    upsert(args: {
      readonly where: {
        readonly commerceOrderId_platformOrderItemId: {
          readonly commerceOrderId: string;
          readonly platformOrderItemId: string;
        };
      };
      readonly create: CommerceOrderItemCreateData;
      readonly update: CommerceOrderItemUpdateData;
    }): Promise<unknown>;
  };
  readonly commerceProduct: {
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_platformProductId: {
          readonly connectedStoreId: string;
          readonly platformProductId: string;
        };
      };
      readonly create: CommerceProductCreateData;
      readonly update: CommerceProductUpdateData;
    }): Promise<unknown>;
  };
  readonly commerceCustomer: {
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_platformCustomerId: {
          readonly connectedStoreId: string;
          readonly platformCustomerId: string;
        };
      };
      readonly create: CommerceCustomerCreateData;
      readonly update: CommerceCustomerUpdateData;
    }): Promise<unknown>;
  };
  readonly commerceInventorySnapshot: {
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_platformProductId_capturedAt: {
          readonly capturedAt: Date;
          readonly connectedStoreId: string;
          readonly platformProductId: string;
        };
      };
      readonly create: CommerceInventorySnapshotCreateData;
      readonly update: CommerceInventorySnapshotUpdateData;
    }): Promise<unknown>;
  };
  readonly commerceCategory: {
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_platformCategoryId: {
          readonly connectedStoreId: string;
          readonly platformCategoryId: string;
        };
      };
      readonly create: CommerceCategoryCreateData;
      readonly update: CommerceCategoryUpdateData;
    }): Promise<unknown>;
  };
  readonly commerceRefund: {
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_platformRefundId: {
          readonly connectedStoreId: string;
          readonly platformRefundId: string;
        };
      };
      readonly create: CommerceRefundCreateData;
      readonly update: CommerceRefundUpdateData;
    }): Promise<unknown>;
  };
}

type JsonCompatible = Readonly<Record<string, unknown>>;
type MutablePersistenceResult = {
  -readonly [Key in keyof WooCommerceCommercePersistenceResult]: WooCommerceCommercePersistenceResult[Key];
};

type CommerceOrderCreateData = ReturnType<typeof toCommerceOrderCreateData>;
type CommerceOrderUpdateData = ReturnType<typeof toCommerceOrderUpdateData>;
type CommerceOrderItemCreateData = ReturnType<typeof toCommerceOrderItemCreateData>;
type CommerceOrderItemUpdateData = ReturnType<typeof toCommerceOrderItemUpdateData>;
type CommerceProductCreateData = ReturnType<typeof toCommerceProductCreateData>;
type CommerceProductUpdateData = ReturnType<typeof toCommerceProductUpdateData>;
type CommerceCustomerCreateData = ReturnType<typeof toCommerceCustomerCreateData>;
type CommerceCustomerUpdateData = ReturnType<typeof toCommerceCustomerUpdateData>;
type CommerceInventorySnapshotCreateData = ReturnType<typeof toCommerceInventorySnapshotCreateData>;
type CommerceInventorySnapshotUpdateData = ReturnType<typeof toCommerceInventorySnapshotUpdateData>;
type CommerceCategoryCreateData = ReturnType<typeof toCommerceCategoryCreateData>;
type CommerceCategoryUpdateData = ReturnType<typeof toCommerceCategoryUpdateData>;
type CommerceRefundCreateData = ReturnType<typeof toCommerceRefundCreateData>;
type CommerceRefundUpdateData = ReturnType<typeof toCommerceRefundUpdateData>;

export interface WooCommerceCommercePersistenceInput {
  readonly orders?: readonly NormalizedWooCommerceOrderTree[];
  readonly products?: readonly NormalizedCommerceProduct[];
  readonly customers?: readonly NormalizedCommerceCustomer[];
  readonly inventorySnapshots?: readonly NormalizedCommerceInventorySnapshot[];
  readonly categories?: readonly NormalizedCommerceCategory[];
  readonly refunds?: readonly NormalizedCommerceRefund[];
}

export interface WooCommerceCommercePersistenceResult {
  readonly orders: number;
  readonly orderItems: number;
  readonly products: number;
  readonly customers: number;
  readonly inventorySnapshots: number;
  readonly categories: number;
  readonly refunds: number;
}

@Injectable()
export class WooCommerceCommercePersistenceService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async persistCommerceData(
    input: WooCommerceCommercePersistenceInput,
  ): Promise<WooCommerceCommercePersistenceResult> {
    const result = createEmptyResult();
    const syncDates: Date[] = [];

    for (const customer of input.customers ?? []) {
      await this.persistCustomer(customer);
      result.customers += 1;
      syncDates.push(customer.lastSyncedAt);
    }

    for (const product of input.products ?? []) {
      await this.persistProduct(product);
      result.products += 1;
      syncDates.push(product.lastSyncedAt);
    }

    for (const category of input.categories ?? []) {
      await this.persistCategory(category);
      result.categories += 1;
      syncDates.push(category.lastSyncedAt);
    }

    for (const inventorySnapshot of input.inventorySnapshots ?? []) {
      await this.persistInventorySnapshot(inventorySnapshot);
      result.inventorySnapshots += 1;
      syncDates.push(inventorySnapshot.lastSyncedAt);
    }

    for (const orderTree of input.orders ?? []) {
      const orderResult = await this.persistOrderTree(orderTree);
      result.orders += 1;
      result.orderItems += orderResult.orderItems;
      result.refunds += orderResult.refunds;
      syncDates.push(orderTree.order.lastSyncedAt);
    }

    for (const refund of input.refunds ?? []) {
      await this.persistRefund(refund);
      result.refunds += 1;
      syncDates.push(refund.lastSyncedAt);
    }

    await this.updateConnectedStoreLastSynchronisedAt(input, syncDates);

    return result;
  }

  async persistOrderTree(
    orderTree: NormalizedWooCommerceOrderTree,
  ): Promise<{ readonly orderItems: number; readonly refunds: number }> {
    const prisma = this.prisma;
    const order = await prisma.commerceOrder.upsert({
      where: orderUniqueWhere(orderTree.order),
      create: toCommerceOrderCreateData(orderTree.order),
      update: toCommerceOrderUpdateData(orderTree.order),
      select: { id: true },
    });

    for (const item of orderTree.items) {
      await prisma.commerceOrderItem.upsert({
        where: {
          commerceOrderId_platformOrderItemId: {
            commerceOrderId: order.id,
            platformOrderItemId: item.platformOrderItemId,
          },
        },
        create: toCommerceOrderItemCreateData(item, order.id),
        update: toCommerceOrderItemUpdateData(item),
      });
    }

    for (const refund of orderTree.refunds) {
      await this.persistRefund(refund, order.id);
    }

    await this.updateStoreLastSynchronisedAt(
      orderTree.order.connectedStoreId,
      orderTree.order.lastSyncedAt,
    );

    return { orderItems: orderTree.items.length, refunds: orderTree.refunds.length };
  }

  async persistProduct(product: NormalizedCommerceProduct): Promise<void> {
    await this.prisma.commerceProduct.upsert({
      where: {
        connectedStoreId_platformProductId: {
          connectedStoreId: product.connectedStoreId,
          platformProductId: product.platformProductId,
        },
      },
      create: toCommerceProductCreateData(product),
      update: toCommerceProductUpdateData(product),
    });
    await this.updateStoreLastSynchronisedAt(product.connectedStoreId, product.lastSyncedAt);
  }

  async persistCustomer(customer: NormalizedCommerceCustomer): Promise<void> {
    await this.prisma.commerceCustomer.upsert({
      where: {
        connectedStoreId_platformCustomerId: {
          connectedStoreId: customer.connectedStoreId,
          platformCustomerId: customer.platformCustomerId,
        },
      },
      create: toCommerceCustomerCreateData(customer),
      update: toCommerceCustomerUpdateData(customer),
    });
    await this.updateStoreLastSynchronisedAt(customer.connectedStoreId, customer.lastSyncedAt);
  }

  async persistInventorySnapshot(snapshot: NormalizedCommerceInventorySnapshot): Promise<void> {
    await this.prisma.commerceInventorySnapshot.upsert({
      where: {
        connectedStoreId_platformProductId_capturedAt: {
          capturedAt: snapshot.capturedAt,
          connectedStoreId: snapshot.connectedStoreId,
          platformProductId: snapshot.platformProductId,
        },
      },
      create: toCommerceInventorySnapshotCreateData(snapshot),
      update: toCommerceInventorySnapshotUpdateData(snapshot),
    });
    await this.updateStoreLastSynchronisedAt(snapshot.connectedStoreId, snapshot.lastSyncedAt);
  }

  async persistCategory(category: NormalizedCommerceCategory): Promise<void> {
    await this.prisma.commerceCategory.upsert({
      where: {
        connectedStoreId_platformCategoryId: {
          connectedStoreId: category.connectedStoreId,
          platformCategoryId: category.platformCategoryId,
        },
      },
      create: toCommerceCategoryCreateData(category),
      update: toCommerceCategoryUpdateData(category),
    });
    await this.updateStoreLastSynchronisedAt(category.connectedStoreId, category.lastSyncedAt);
  }

  async persistRefund(refund: NormalizedCommerceRefund, commerceOrderId?: string): Promise<void> {
    const resolvedOrderId = commerceOrderId ?? (await this.findOrderIdForRefund(refund));

    await this.prisma.commerceRefund.upsert({
      where: {
        connectedStoreId_platformRefundId: {
          connectedStoreId: refund.connectedStoreId,
          platformRefundId: refund.platformRefundId,
        },
      },
      create: toCommerceRefundCreateData(refund, resolvedOrderId),
      update: toCommerceRefundUpdateData(refund, resolvedOrderId),
    });
    await this.updateStoreLastSynchronisedAt(refund.connectedStoreId, refund.lastSyncedAt);
  }

  private async findOrderIdForRefund(refund: NormalizedCommerceRefund): Promise<string | undefined> {
    if (!refund.platformOrderId) {
      return undefined;
    }

    const order = await this.prisma.commerceOrder.findUnique({
      where: {
        connectedStoreId_platformOrderId: {
          connectedStoreId: refund.connectedStoreId,
          platformOrderId: refund.platformOrderId,
        },
      },
      select: { id: true },
    });

    return order?.id;
  }

  private async updateConnectedStoreLastSynchronisedAt(
    input: WooCommerceCommercePersistenceInput,
    syncDates: readonly Date[],
  ): Promise<void> {
    const connectedStoreId = findFirstConnectedStoreId(input);
    const lastSynchronisedAt = maxDate(syncDates);

    if (!connectedStoreId || !lastSynchronisedAt) {
      return;
    }

    await this.updateStoreLastSynchronisedAt(connectedStoreId, lastSynchronisedAt);
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

  private get prisma(): WooCommerceCommercePersistencePrismaClient {
    return this.prismaService.client as unknown as WooCommerceCommercePersistencePrismaClient;
  }
}

function createEmptyResult(): MutablePersistenceResult {
  return {
    categories: 0,
    customers: 0,
    inventorySnapshots: 0,
    orderItems: 0,
    orders: 0,
    products: 0,
    refunds: 0,
  };
}

function toCommerceOrderCreateData(order: NormalizedCommerceOrder) {
  return withoutUndefined({
    businessId: order.businessId,
    connectedStoreId: order.connectedStoreId,
    platform: order.platform,
    platformOrderId: order.platformOrderId,
    platformOrderNumber: order.platformOrderNumber,
    orderStatus: order.orderStatus,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    totalAmount: order.totalAmount,
    taxAmount: order.taxAmount,
    shippingAmount: order.shippingAmount,
    discountAmount: order.discountAmount,
    refundedAmount: order.refundedAmount,
    orderedAt: order.orderedAt,
    platformCreatedAt: order.platformCreatedAt,
    platformUpdatedAt: order.platformUpdatedAt,
    sourceMetadata: toJsonCompatible(order.sourceMetadata),
    importedAt: order.importedAt,
    lastSyncedAt: order.lastSyncedAt,
  });
}

function toCommerceOrderUpdateData(order: NormalizedCommerceOrder) {
  return withoutUndefined({
    platformOrderNumber: order.platformOrderNumber,
    orderStatus: order.orderStatus,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    totalAmount: order.totalAmount,
    taxAmount: order.taxAmount,
    shippingAmount: order.shippingAmount,
    discountAmount: order.discountAmount,
    refundedAmount: order.refundedAmount,
    orderedAt: order.orderedAt,
    platformCreatedAt: order.platformCreatedAt,
    platformUpdatedAt: order.platformUpdatedAt,
    sourceMetadata: toJsonCompatible(order.sourceMetadata),
    lastSyncedAt: order.lastSyncedAt,
  });
}

function toCommerceOrderItemCreateData(item: NormalizedCommerceOrderItem, commerceOrderId: string) {
  return withoutUndefined({
    businessId: item.businessId,
    connectedStoreId: item.connectedStoreId,
    commerceOrderId,
    platform: item.platform,
    platformOrderItemId: item.platformOrderItemId,
    platformProductId: item.platformProductId,
    platformVariationId: item.platformVariationId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unitPriceAmount: item.unitPriceAmount,
    subtotalAmount: item.subtotalAmount,
    totalAmount: item.totalAmount,
    taxAmount: item.taxAmount,
    sourceMetadata: toJsonCompatible(item.sourceMetadata),
    importedAt: item.importedAt,
    lastSyncedAt: item.lastSyncedAt,
  });
}

function toCommerceOrderItemUpdateData(item: NormalizedCommerceOrderItem) {
  return withoutUndefined({
    platformProductId: item.platformProductId,
    platformVariationId: item.platformVariationId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unitPriceAmount: item.unitPriceAmount,
    subtotalAmount: item.subtotalAmount,
    totalAmount: item.totalAmount,
    taxAmount: item.taxAmount,
    sourceMetadata: toJsonCompatible(item.sourceMetadata),
    lastSyncedAt: item.lastSyncedAt,
  });
}

function toCommerceProductCreateData(product: NormalizedCommerceProduct) {
  return withoutUndefined({
    businessId: product.businessId,
    connectedStoreId: product.connectedStoreId,
    platform: product.platform,
    platformProductId: product.platformProductId,
    platformVariationId: product.platformVariationId,
    sku: product.sku,
    name: product.name,
    productType: product.productType,
    productStatus: product.productStatus,
    currency: product.currency,
    priceAmount: product.priceAmount,
    regularPriceAmount: product.regularPriceAmount,
    salePriceAmount: product.salePriceAmount,
    stockStatus: product.stockStatus,
    currentStockQuantity: product.currentStockQuantity,
    platformCreatedAt: product.platformCreatedAt,
    platformUpdatedAt: product.platformUpdatedAt,
    sourceMetadata: toJsonCompatible(product.sourceMetadata),
    importedAt: product.importedAt,
    lastSyncedAt: product.lastSyncedAt,
  });
}

function toCommerceProductUpdateData(product: NormalizedCommerceProduct) {
  return withoutUndefined({
    platformVariationId: product.platformVariationId,
    sku: product.sku,
    name: product.name,
    productType: product.productType,
    productStatus: product.productStatus,
    currency: product.currency,
    priceAmount: product.priceAmount,
    regularPriceAmount: product.regularPriceAmount,
    salePriceAmount: product.salePriceAmount,
    stockStatus: product.stockStatus,
    currentStockQuantity: product.currentStockQuantity,
    platformCreatedAt: product.platformCreatedAt,
    platformUpdatedAt: product.platformUpdatedAt,
    sourceMetadata: toJsonCompatible(product.sourceMetadata),
    lastSyncedAt: product.lastSyncedAt,
  });
}

function toCommerceCustomerCreateData(customer: NormalizedCommerceCustomer) {
  return withoutUndefined({
    businessId: customer.businessId,
    connectedStoreId: customer.connectedStoreId,
    platform: customer.platform,
    platformCustomerId: customer.platformCustomerId,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    username: customer.username,
    customerRole: customer.customerRole,
    platformCreatedAt: customer.platformCreatedAt,
    platformUpdatedAt: customer.platformUpdatedAt,
    sourceMetadata: toJsonCompatible(customer.sourceMetadata),
    importedAt: customer.importedAt,
    lastSyncedAt: customer.lastSyncedAt,
  });
}

function toCommerceCustomerUpdateData(customer: NormalizedCommerceCustomer) {
  return withoutUndefined({
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    username: customer.username,
    customerRole: customer.customerRole,
    platformCreatedAt: customer.platformCreatedAt,
    platformUpdatedAt: customer.platformUpdatedAt,
    sourceMetadata: toJsonCompatible(customer.sourceMetadata),
    lastSyncedAt: customer.lastSyncedAt,
  });
}

function toCommerceInventorySnapshotCreateData(snapshot: NormalizedCommerceInventorySnapshot) {
  return withoutUndefined({
    businessId: snapshot.businessId,
    connectedStoreId: snapshot.connectedStoreId,
    platform: snapshot.platform,
    platformProductId: snapshot.platformProductId,
    sku: snapshot.sku,
    stockQuantity: snapshot.stockQuantity,
    stockStatus: snapshot.stockStatus,
    manageStock: snapshot.manageStock,
    capturedAt: snapshot.capturedAt,
    sourceMetadata: toJsonCompatible(snapshot.sourceMetadata),
    importedAt: snapshot.importedAt,
    lastSyncedAt: snapshot.lastSyncedAt,
  });
}

function toCommerceInventorySnapshotUpdateData(snapshot: NormalizedCommerceInventorySnapshot) {
  return withoutUndefined({
    sku: snapshot.sku,
    stockQuantity: snapshot.stockQuantity,
    stockStatus: snapshot.stockStatus,
    manageStock: snapshot.manageStock,
    sourceMetadata: toJsonCompatible(snapshot.sourceMetadata),
    lastSyncedAt: snapshot.lastSyncedAt,
  });
}

function toCommerceCategoryCreateData(category: NormalizedCommerceCategory) {
  return withoutUndefined({
    businessId: category.businessId,
    connectedStoreId: category.connectedStoreId,
    platform: category.platform,
    platformCategoryId: category.platformCategoryId,
    platformParentCategoryId: category.platformParentCategoryId,
    name: category.name,
    slug: category.slug,
    productCount: category.productCount,
    sourceMetadata: toJsonCompatible(category.sourceMetadata),
    importedAt: category.importedAt,
    lastSyncedAt: category.lastSyncedAt,
  });
}

function toCommerceCategoryUpdateData(category: NormalizedCommerceCategory) {
  return withoutUndefined({
    platformParentCategoryId: category.platformParentCategoryId,
    name: category.name,
    slug: category.slug,
    productCount: category.productCount,
    sourceMetadata: toJsonCompatible(category.sourceMetadata),
    lastSyncedAt: category.lastSyncedAt,
  });
}

function toCommerceRefundCreateData(refund: NormalizedCommerceRefund, commerceOrderId: string | undefined) {
  return withoutUndefined({
    businessId: refund.businessId,
    connectedStoreId: refund.connectedStoreId,
    commerceOrderId,
    platform: refund.platform,
    platformRefundId: refund.platformRefundId,
    platformOrderId: refund.platformOrderId,
    refundStatus: refund.refundStatus,
    reason: refund.reason,
    currency: refund.currency,
    amount: refund.amount,
    refundedAt: refund.refundedAt,
    sourceMetadata: toJsonCompatible(refund.sourceMetadata),
    importedAt: refund.importedAt,
    lastSyncedAt: refund.lastSyncedAt,
  });
}

function toCommerceRefundUpdateData(refund: NormalizedCommerceRefund, commerceOrderId: string | undefined) {
  return withoutUndefined({
    commerceOrderId,
    platformOrderId: refund.platformOrderId,
    refundStatus: refund.refundStatus,
    reason: refund.reason,
    currency: refund.currency,
    amount: refund.amount,
    refundedAt: refund.refundedAt,
    sourceMetadata: toJsonCompatible(refund.sourceMetadata),
    lastSyncedAt: refund.lastSyncedAt,
  });
}

function orderUniqueWhere(order: NormalizedCommerceOrder) {
  return {
    connectedStoreId_platformOrderId: {
      connectedStoreId: order.connectedStoreId,
      platformOrderId: order.platformOrderId,
    },
  };
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function toJsonCompatible(value: unknown): JsonCompatible {
  return value as JsonCompatible;
}

function maxDate(dates: readonly Date[]): Date | undefined {
  if (dates.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function findFirstConnectedStoreId(input: WooCommerceCommercePersistenceInput): string | undefined {
  return (
    input.orders?.[0]?.order.connectedStoreId ??
    input.products?.[0]?.connectedStoreId ??
    input.customers?.[0]?.connectedStoreId ??
    input.inventorySnapshots?.[0]?.connectedStoreId ??
    input.categories?.[0]?.connectedStoreId ??
    input.refunds?.[0]?.connectedStoreId
  );
}
