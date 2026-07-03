import type { PrismaClient } from "../packages/database/src/index.js" with { "resolution-mode": "import" };

type JsonObject = Record<string, unknown>;
type StorePlatformType = "WOOCOMMERCE" | "AMAZON_SELLER" | "TIKTOK_SHOP";
type StoreConnectionStatusType = "CONNECTED";
type CommerceSyncCursorStatusType = "SUCCESS";
type CommerceSyncResourceType =
  | "ORDERS"
  | "PRODUCTS"
  | "CUSTOMERS"
  | "INVENTORY"
  | "CATEGORIES"
  | "REFUNDS";

const StorePlatform = {
  AMAZON_SELLER: "AMAZON_SELLER",
  TIKTOK_SHOP: "TIKTOK_SHOP",
  WOOCOMMERCE: "WOOCOMMERCE",
} as const satisfies Record<string, StorePlatformType>;

const StoreConnectionStatus = {
  CONNECTED: "CONNECTED",
} as const satisfies Record<string, StoreConnectionStatusType>;

const CommerceSyncCursorStatus = {
  SUCCESS: "SUCCESS",
} as const satisfies Record<string, CommerceSyncCursorStatusType>;

const CommerceSyncResource = {
  CATEGORIES: "CATEGORIES",
  CUSTOMERS: "CUSTOMERS",
  INVENTORY: "INVENTORY",
  ORDERS: "ORDERS",
  PRODUCTS: "PRODUCTS",
  REFUNDS: "REFUNDS",
} as const satisfies Record<string, CommerceSyncResourceType>;

const demoUser = {
  email: "demo@salense.local",
  firstName: "Maya",
  id: "demo_user_salense_mvp",
  lastName: "Chen",
  password: "DemoPassword123!",
  passwordHash: "$2a$10$22QhGmEHzSBIr766kMiem.MTiT7IbnUwPnwei6OOF84KGXpmEbe2e",
} as const;

const demoBusiness = {
  id: "demo_business_salense_mvp",
  name: "Northstar Home Goods",
} as const;

const demoStoreIds = {
  amazon: "demo_store_amazon_seller",
  tiktok: "demo_store_tiktok_shop",
  woo: "demo_store_woocommerce",
} as const;

const now = new Date();
const today = atHour(now, 10, 30);
const todayAfternoon = atHour(now, 15, 15);
const yesterday = addDays(atHour(now, 14, 5), -1);
const twoDaysAgo = addDays(atHour(now, 11, 45), -2);
const syncTime = new Date();

const stores = [
  {
    id: demoStoreIds.woo,
    platform: StorePlatform.WOOCOMMERCE,
    storeName: "Northstar WooCommerce",
    storeUrl: "https://demo-woocommerce.salense.local",
    region: null,
  },
  {
    id: demoStoreIds.amazon,
    platform: StorePlatform.AMAZON_SELLER,
    storeName: "Northstar Amazon UK",
    storeUrl: null,
    region: "GB",
  },
  {
    id: demoStoreIds.tiktok,
    platform: StorePlatform.TIKTOK_SHOP,
    storeName: "Northstar TikTok Shop",
    storeUrl: null,
    region: "GB",
  },
] as const;

const products = [
  product({
    category: "Lighting",
    connectedStoreId: demoStoreIds.amazon,
    currentStockQuantity: 3,
    name: "Aurora Desk Lamp",
    platform: StorePlatform.AMAZON_SELLER,
    platformProductId: "AMZ-AURORA-LAMP",
    priceAmount: "89.00",
    sku: "AUR-LAMP-AMZ",
    stockStatus: "lowstock",
  }),
  product({
    category: "Bundles",
    connectedStoreId: demoStoreIds.tiktok,
    currentStockQuantity: 18,
    name: "Glow Kitchen Starter Kit",
    platform: StorePlatform.TIKTOK_SHOP,
    platformProductId: "TT-GLOW-KIT",
    priceAmount: "42.00",
    sku: "GLOW-KIT-TT",
    stockStatus: "instock",
  }),
  product({
    category: "Storage",
    connectedStoreId: demoStoreIds.woo,
    currentStockQuantity: 24,
    name: "Oak Pantry Organiser",
    platform: StorePlatform.WOOCOMMERCE,
    platformProductId: "WOO-OAK-PANTRY",
    priceAmount: "64.00",
    sku: "OAK-PANTRY-WOO",
    stockStatus: "instock",
  }),
  product({
    category: "Textiles",
    connectedStoreId: demoStoreIds.woo,
    currentStockQuantity: 2,
    name: "Linen Table Runner",
    platform: StorePlatform.WOOCOMMERCE,
    platformProductId: "WOO-LINEN-RUNNER",
    priceAmount: "28.00",
    sku: "LINEN-RUN-WOO",
    stockStatus: "lowstock",
  }),
  product({
    category: "Lighting",
    connectedStoreId: demoStoreIds.amazon,
    currentStockQuantity: 11,
    name: "Nordic Wall Light Pair",
    platform: StorePlatform.AMAZON_SELLER,
    platformProductId: "AMZ-WALL-LIGHT-PAIR",
    priceAmount: "119.00",
    sku: "WALL-LIGHT-AMZ",
    stockStatus: "instock",
  }),
  product({
    category: "Accessories",
    connectedStoreId: demoStoreIds.tiktok,
    currentStockQuantity: 0,
    name: "Mini Ceramic Vase Set",
    platform: StorePlatform.TIKTOK_SHOP,
    platformProductId: "TT-VASE-MINI",
    priceAmount: "24.00",
    sku: "VASE-MINI-TT",
    stockStatus: "outofstock",
  }),
] as const;

const customers = [
  customer(
    "woo_cust_101",
    demoStoreIds.woo,
    StorePlatform.WOOCOMMERCE,
    "amelia.brooks@example.test",
    "Amelia",
    "Brooks",
  ),
  customer(
    "woo_cust_102",
    demoStoreIds.woo,
    StorePlatform.WOOCOMMERCE,
    "oliver.reed@example.test",
    "Oliver",
    "Reed",
  ),
  customer(
    "amz_cust_201",
    demoStoreIds.amazon,
    StorePlatform.AMAZON_SELLER,
    "sophia.patel@example.test",
    "Sophia",
    "Patel",
  ),
  customer(
    "amz_cust_202",
    demoStoreIds.amazon,
    StorePlatform.AMAZON_SELLER,
    "noah.evans@example.test",
    "Noah",
    "Evans",
  ),
  customer(
    "tt_cust_301",
    demoStoreIds.tiktok,
    StorePlatform.TIKTOK_SHOP,
    "ava.morgan@example.test",
    "Ava",
    "Morgan",
  ),
  customer(
    "tt_cust_302",
    demoStoreIds.tiktok,
    StorePlatform.TIKTOK_SHOP,
    "leo.turner@example.test",
    "Leo",
    "Turner",
  ),
] as const;

const orders = [
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "sophia.patel@example.test",
    customerName: "Sophia Patel",
    items: [
      item("1", "AMZ-AURORA-LAMP", "AUR-LAMP-AMZ", "Aurora Desk Lamp", 4, "89.00"),
      item("2", "AMZ-WALL-LIGHT-PAIR", "WALL-LIGHT-AMZ", "Nordic Wall Light Pair", 1, "119.00"),
    ],
    orderedAt: today,
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-10001",
    platformOrderNumber: "AMZ-10001",
    status: "shipped",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "ava.morgan@example.test",
    customerName: "Ava Morgan",
    items: [item("1", "TT-GLOW-KIT", "GLOW-KIT-TT", "Glow Kitchen Starter Kit", 5, "42.00")],
    orderedAt: todayAfternoon,
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-22001",
    platformOrderNumber: "TT-22001",
    status: "processing",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "amelia.brooks@example.test",
    customerName: "Amelia Brooks",
    items: [
      item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 2, "64.00"),
      item("2", "WOO-LINEN-RUNNER", "LINEN-RUN-WOO", "Linen Table Runner", 3, "28.00"),
    ],
    orderedAt: today,
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10045",
    platformOrderNumber: "#10045",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "noah.evans@example.test",
    customerName: "Noah Evans",
    items: [
      item("1", "AMZ-WALL-LIGHT-PAIR", "WALL-LIGHT-AMZ", "Nordic Wall Light Pair", 2, "119.00"),
    ],
    orderedAt: yesterday,
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-09991",
    platformOrderNumber: "AMZ-09991",
    status: "delivered",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "oliver.reed@example.test",
    customerName: "Oliver Reed",
    items: [item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 1, "64.00")],
    orderedAt: yesterday,
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10044",
    platformOrderNumber: "#10044",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "leo.turner@example.test",
    customerName: "Leo Turner",
    items: [
      item("1", "TT-GLOW-KIT", "GLOW-KIT-TT", "Glow Kitchen Starter Kit", 2, "42.00"),
      item("2", "TT-VASE-MINI", "VASE-MINI-TT", "Mini Ceramic Vase Set", 1, "24.00"),
    ],
    orderedAt: twoDaysAgo,
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-21980",
    platformOrderNumber: "TT-21980",
    status: "completed",
  }),
] as const;

const categories = [
  category("cat-lighting", "Lighting", "lighting", null),
  category("cat-bundles", "Bundles", "bundles", null),
  category("cat-storage", "Storage", "storage", null),
  category("cat-textiles", "Textiles", "textiles", null),
  category("cat-accessories", "Accessories", "accessories", null),
] as const;

async function main(): Promise<void> {
  const { PrismaClient } = await import("../packages/database/src/index.js");
  const prisma = new PrismaClient();

  try {
    await prisma.user.deleteMany({ where: { email: demoUser.email } });

    await prisma.user.create({
      data: {
        email: demoUser.email,
        emailVerified: true,
        emailVerifiedAt: syncTime,
        firstName: demoUser.firstName,
        id: demoUser.id,
        lastName: demoUser.lastName,
        passwordHash: demoUser.passwordHash,
      },
    });

    await prisma.business.create({
      data: {
        country: "GB",
        currency: "GBP",
        id: demoBusiness.id,
        industry: "Homeware and lifestyle retail",
        name: demoBusiness.name,
        ownerId: demoUser.id,
        taxPreference: "VAT_REGISTERED",
        timeZone: "Europe/London",
        tradingName: "Northstar Home",
      },
    });

    await Promise.all(stores.map((store) => createStore(prisma, store)));
    await Promise.all(customers.map((customerRecord) => createCustomer(prisma, customerRecord)));
    await Promise.all(
      categories.flatMap((categoryRecord) =>
        stores.map((store) => createCategory(prisma, store, categoryRecord)),
      ),
    );
    await Promise.all(products.map((productRecord) => createProduct(prisma, productRecord)));
    await Promise.all(
      products.map((productRecord) => createInventorySnapshot(prisma, productRecord)),
    );

    for (const orderRecord of orders) {
      await createOrderWithItems(prisma, orderRecord);
    }

    await createRefund(prisma);
    await createSyncCursors(prisma);

    console.log("Salense MVP demo data seeded successfully.");
    console.log(`Login: ${demoUser.email}`);
    console.log(`Password: ${demoUser.password}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function createStore(prisma: PrismaClient, store: (typeof stores)[number]): Promise<void> {
  await prisma.connectedStore.create({
    data: {
      accessTokenHash: `demo_${store.platform.toLowerCase()}_access_hash`,
      accessTokenMetadata: safeDemoMetadata({ credentialKind: "demo_placeholder_access_token" }),
      businessId: demoBusiness.id,
      connectionStatus: StoreConnectionStatus.CONNECTED,
      id: store.id,
      lastSynchronisedAt: syncTime,
      platform: store.platform,
      refreshTokenHash: `demo_${store.platform.toLowerCase()}_refresh_hash`,
      refreshTokenMetadata: safeDemoMetadata({ credentialKind: "demo_placeholder_refresh_token" }),
      region: store.region,
      storeName: store.storeName,
      storeUrl: store.storeUrl,
    },
  });
}

async function createProduct(prisma: PrismaClient, productRecord: ProductSeed): Promise<void> {
  await prisma.commerceProduct.create({
    data: {
      businessId: demoBusiness.id,
      connectedStoreId: productRecord.connectedStoreId,
      currency: "GBP",
      currentStockQuantity: productRecord.currentStockQuantity,
      lastSyncedAt: syncTime,
      name: productRecord.name,
      platform: productRecord.platform,
      platformCreatedAt: addDays(syncTime, -30),
      platformProductId: productRecord.platformProductId,
      platformUpdatedAt: syncTime,
      priceAmount: productRecord.priceAmount,
      productStatus: "publish",
      productType: "simple",
      regularPriceAmount: productRecord.priceAmount,
      sku: productRecord.sku,
      sourceMetadata: sourceMetadata(productRecord.platform, {
        categories: [{ name: productRecord.category }],
        demoProductId: productRecord.platformProductId,
      }),
      stockStatus: productRecord.stockStatus,
    },
  });
}

async function createInventorySnapshot(
  prisma: PrismaClient,
  productRecord: ProductSeed,
): Promise<void> {
  await prisma.commerceInventorySnapshot.create({
    data: {
      businessId: demoBusiness.id,
      capturedAt: syncTime,
      connectedStoreId: productRecord.connectedStoreId,
      lastSyncedAt: syncTime,
      manageStock: true,
      platform: productRecord.platform,
      platformProductId: productRecord.platformProductId,
      sku: productRecord.sku,
      sourceMetadata: sourceMetadata(productRecord.platform, { demoInventory: true }),
      stockQuantity: productRecord.currentStockQuantity,
      stockStatus: productRecord.stockStatus,
    },
  });
}

async function createCustomer(prisma: PrismaClient, customerRecord: CustomerSeed): Promise<void> {
  await prisma.commerceCustomer.create({
    data: {
      businessId: demoBusiness.id,
      connectedStoreId: customerRecord.connectedStoreId,
      customerRole: "customer",
      email: customerRecord.email,
      firstName: customerRecord.firstName,
      lastName: customerRecord.lastName,
      lastSyncedAt: syncTime,
      platform: customerRecord.platform,
      platformCreatedAt: addDays(syncTime, -20),
      platformCustomerId: customerRecord.platformCustomerId,
      platformUpdatedAt: syncTime,
      sourceMetadata: sourceMetadata(customerRecord.platform, { demoCustomer: true }),
      username: customerRecord.email.split("@")[0],
    },
  });
}

async function createCategory(
  prisma: PrismaClient,
  store: (typeof stores)[number],
  categoryRecord: CategorySeed,
): Promise<void> {
  await prisma.commerceCategory.create({
    data: {
      businessId: demoBusiness.id,
      connectedStoreId: store.id,
      lastSyncedAt: syncTime,
      name: categoryRecord.name,
      platform: store.platform,
      platformCategoryId: `${store.platform}-${categoryRecord.platformCategoryId}`,
      platformParentCategoryId: categoryRecord.platformParentCategoryId,
      productCount: products.filter(
        (productRecord) =>
          productRecord.connectedStoreId === store.id &&
          productRecord.category === categoryRecord.name,
      ).length,
      slug: categoryRecord.slug,
      sourceMetadata: sourceMetadata(store.platform, { demoCategory: categoryRecord.name }),
    },
  });
}

async function createOrderWithItems(prisma: PrismaClient, orderRecord: OrderSeed): Promise<void> {
  const totalAmount = orderRecord.items.reduce(
    (total, orderItem) => total + Number(orderItem.totalAmount),
    0,
  );

  const createdOrder = await prisma.commerceOrder.create({
    data: {
      businessId: demoBusiness.id,
      connectedStoreId: orderRecord.connectedStoreId,
      currency: "GBP",
      discountAmount: "0",
      lastSyncedAt: syncTime,
      orderStatus: orderRecord.status,
      orderedAt: orderRecord.orderedAt,
      platform: orderRecord.platform,
      platformCreatedAt: orderRecord.orderedAt,
      platformOrderId: orderRecord.platformOrderId,
      platformOrderNumber: orderRecord.platformOrderNumber,
      platformUpdatedAt: syncTime,
      shippingAmount: "4.99",
      sourceMetadata: sourceMetadata(orderRecord.platform, {
        billing: toBilling(orderRecord.customerName, orderRecord.customerEmail),
        demoOrder: true,
      }),
      subtotalAmount: totalAmount.toFixed(2),
      taxAmount: "0",
      totalAmount: totalAmount.toFixed(2),
    },
  });

  for (const orderItem of orderRecord.items) {
    await prisma.commerceOrderItem.create({
      data: {
        businessId: demoBusiness.id,
        commerceOrderId: createdOrder.id,
        connectedStoreId: orderRecord.connectedStoreId,
        lastSyncedAt: syncTime,
        name: orderItem.name,
        platform: orderRecord.platform,
        platformOrderItemId: `${orderRecord.platformOrderId}-${orderItem.lineNumber}`,
        platformProductId: orderItem.platformProductId,
        quantity: orderItem.quantity,
        sku: orderItem.sku,
        sourceMetadata: sourceMetadata(orderRecord.platform, { demoOrderItem: true }),
        subtotalAmount: orderItem.totalAmount,
        totalAmount: orderItem.totalAmount,
        unitPriceAmount: orderItem.unitPriceAmount,
      },
    });
  }
}

async function createRefund(prisma: PrismaClient): Promise<void> {
  const order = await prisma.commerceOrder.findUnique({
    where: {
      connectedStoreId_platformOrderId: {
        connectedStoreId: demoStoreIds.woo,
        platformOrderId: "10045",
      },
    },
    select: { id: true },
  });

  await prisma.commerceRefund.create({
    data: {
      amount: "28.00",
      businessId: demoBusiness.id,
      commerceOrderId: order?.id,
      connectedStoreId: demoStoreIds.woo,
      currency: "GBP",
      lastSyncedAt: syncTime,
      platform: StorePlatform.WOOCOMMERCE,
      platformOrderId: "10045",
      platformRefundId: "WOO-REF-10045-1",
      reason: "Demo partial refund for one linen runner",
      refundedAt: todayAfternoon,
      refundStatus: "completed",
      sourceMetadata: sourceMetadata(StorePlatform.WOOCOMMERCE, { demoRefund: true }),
    },
  });
}

async function createSyncCursors(prisma: PrismaClient): Promise<void> {
  for (const store of stores) {
    for (const resource of Object.values(CommerceSyncResource)) {
      await prisma.commerceSyncCursor.create({
        data: {
          businessId: demoBusiness.id,
          connectedStoreId: store.id,
          lastAttemptedSyncedAt: syncTime,
          lastSuccessfulSyncedAt: syncTime,
          platform: store.platform,
          resource,
          status: CommerceSyncCursorStatus.SUCCESS,
        },
      });
    }
  }
}

function product(input: ProductSeed): ProductSeed {
  return input;
}

function customer(
  platformCustomerId: string,
  connectedStoreId: string,
  platform: StorePlatformType,
  email: string,
  firstName: string,
  lastName: string,
): CustomerSeed {
  return { connectedStoreId, email, firstName, lastName, platform, platformCustomerId };
}

function category(
  platformCategoryId: string,
  name: string,
  slug: string,
  platformParentCategoryId: string | null,
): CategorySeed {
  return { name, platformCategoryId, platformParentCategoryId, slug };
}

function order(input: OrderSeed): OrderSeed {
  return input;
}

function item(
  lineNumber: string,
  platformProductId: string,
  sku: string,
  name: string,
  quantity: number,
  unitPriceAmount: string,
): OrderItemSeed {
  return {
    lineNumber,
    name,
    platformProductId,
    quantity,
    sku,
    totalAmount: (Number(unitPriceAmount) * quantity).toFixed(2),
    unitPriceAmount,
  };
}

function sourceMetadata(platform: StorePlatformType, raw: JsonObject): JsonObject {
  return {
    demo: true,
    origin: "salense_mvp_demo_seed",
    platform,
    raw,
  };
}

function safeDemoMetadata(extra: JsonObject): JsonObject {
  return {
    demo: true,
    origin: "salense_mvp_demo_seed",
    note: "Placeholder hash metadata only. No real marketplace credentials are stored.",
    ...extra,
  };
}

function toBilling(customerName: string, email: string): JsonObject {
  const [firstName, ...lastNameParts] = customerName.split(" ");

  return {
    email,
    first_name: firstName ?? "Demo",
    last_name: lastNameParts.join(" ") || "Customer",
  };
}

function atHour(date: Date, hour: number, minute: number): Date {
  const value = new Date(date);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

interface ProductSeed {
  readonly category: string;
  readonly connectedStoreId: string;
  readonly currentStockQuantity: number;
  readonly name: string;
  readonly platform: StorePlatformType;
  readonly platformProductId: string;
  readonly priceAmount: string;
  readonly sku: string;
  readonly stockStatus: string;
}

interface CustomerSeed {
  readonly connectedStoreId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly platform: StorePlatformType;
  readonly platformCustomerId: string;
}

interface CategorySeed {
  readonly name: string;
  readonly platformCategoryId: string;
  readonly platformParentCategoryId: string | null;
  readonly slug: string;
}

interface OrderSeed {
  readonly connectedStoreId: string;
  readonly customerEmail: string;
  readonly customerName: string;
  readonly items: readonly OrderItemSeed[];
  readonly orderedAt: Date;
  readonly platform: StorePlatformType;
  readonly platformOrderId: string;
  readonly platformOrderNumber: string;
  readonly status: string;
}

interface OrderItemSeed {
  readonly lineNumber: string;
  readonly name: string;
  readonly platformProductId: string;
  readonly quantity: number;
  readonly sku: string;
  readonly totalAmount: string;
  readonly unitPriceAmount: string;
}

void main().catch((error: unknown) => {
  console.error("Failed to seed Salense MVP demo data.", error);
  process.exitCode = 1;
});
