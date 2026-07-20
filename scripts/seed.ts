import type { PrismaClient } from "../packages/database/src/index.js" with { "resolution-mode": "import" };

type JsonObject = Record<string, unknown>;
type StorePlatformType = "WOOCOMMERCE" | "AMAZON_SELLER" | "TIKTOK_SHOP" | "SHOPIFY";
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
  SHOPIFY: "SHOPIFY",
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
  shopify: "demo_store_shopify",
  tiktok: "demo_store_tiktok_shop",
  woo: "demo_store_woocommerce",
} as const;

const includeWooCommerceInScreenshotSeed = false;

const now = new Date();
const todayEarly = atHour(now, 8, 45);
const today = atHour(now, 10, 30);
const todayMidday = atHour(now, 12, 20);
const todayAfternoon = atHour(now, 15, 15);
const todayEvening = atHour(now, 18, 35);
const yesterday = addDays(atHour(now, 14, 5), -1);
const twoDaysAgo = addDays(atHour(now, 11, 45), -2);
const syncTime = new Date();

const allStores = [
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
    id: demoStoreIds.shopify,
    platform: StorePlatform.SHOPIFY,
    storeName: "Northstar Shopify",
    storeUrl: "https://northstar-home.myshopify.com",
    region: null,
  },
  {
    id: demoStoreIds.tiktok,
    platform: StorePlatform.TIKTOK_SHOP,
    storeName: "Northstar TikTok Shop",
    storeUrl: null,
    region: "GB",
  },
] as const;

const stores = allStores.filter(
  (store) => includeWooCommerceInScreenshotSeed || store.platform !== StorePlatform.WOOCOMMERCE,
);
const activeSeedStoreIds = new Set(stores.map((store) => store.id));

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
    connectedStoreId: demoStoreIds.shopify,
    currentStockQuantity: 9,
    name: "Bamboo Drawer Divider",
    platform: StorePlatform.SHOPIFY,
    platformProductId: "SHOP-BAMBOO-DIVIDER",
    priceAmount: "32.00",
    sku: "BAMBOO-DIV-SHOP",
    stockStatus: "instock",
  }),
  product({
    category: "Accessories",
    connectedStoreId: demoStoreIds.shopify,
    currentStockQuantity: 1,
    name: "Marble Soap Tray",
    platform: StorePlatform.SHOPIFY,
    platformProductId: "SHOP-MARBLE-TRAY",
    priceAmount: "18.00",
    sku: "MARBLE-TRAY-SHOP",
    stockStatus: "lowstock",
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
  product({
    category: "Textiles",
    connectedStoreId: demoStoreIds.shopify,
    currentStockQuantity: 16,
    name: "Cotton Cloud Bath Towel Set",
    platform: StorePlatform.SHOPIFY,
    platformProductId: "SHOP-COTTON-TOWEL",
    priceAmount: "48.00",
    sku: "COTTON-TOWEL-SHOP",
    stockStatus: "instock",
  }),
  product({
    category: "Lighting",
    connectedStoreId: demoStoreIds.woo,
    currentStockQuantity: 6,
    name: "Amber Bedside Lamp",
    platform: StorePlatform.WOOCOMMERCE,
    platformProductId: "WOO-AMBER-LAMP",
    priceAmount: "72.00",
    sku: "AMBER-LAMP-WOO",
    stockStatus: "instock",
  }),
  product({
    category: "Bundles",
    connectedStoreId: demoStoreIds.amazon,
    currentStockQuantity: 4,
    name: "Weekend Home Refresh Bundle",
    platform: StorePlatform.AMAZON_SELLER,
    platformProductId: "AMZ-HOME-REFRESH",
    priceAmount: "156.00",
    sku: "HOME-REFRESH-AMZ",
    stockStatus: "lowstock",
  }),
  product({
    category: "Storage",
    connectedStoreId: demoStoreIds.tiktok,
    currentStockQuantity: 13,
    name: "Stackable Pantry Jar Trio",
    platform: StorePlatform.TIKTOK_SHOP,
    platformProductId: "TT-PANTRY-JARS",
    priceAmount: "36.00",
    sku: "PANTRY-JARS-TT",
    stockStatus: "instock",
  }),
  product({
    category: "Accessories",
    connectedStoreId: demoStoreIds.shopify,
    currentStockQuantity: 5,
    name: "Brass Cabinet Handle Pack",
    platform: StorePlatform.SHOPIFY,
    platformProductId: "SHOP-BRASS-HANDLE",
    priceAmount: "29.00",
    sku: "BRASS-HANDLE-SHOP",
    stockStatus: "instock",
  }),
  product({
    category: "Textiles",
    connectedStoreId: demoStoreIds.woo,
    currentStockQuantity: 3,
    name: "Waffle Throw Blanket",
    platform: StorePlatform.WOOCOMMERCE,
    platformProductId: "WOO-WAFFLE-BLANKET",
    priceAmount: "58.00",
    sku: "WAFFLE-BLANKET-WOO",
    stockStatus: "lowstock",
  }),
  product({
    category: "Accessories",
    connectedStoreId: demoStoreIds.amazon,
    currentStockQuantity: 22,
    name: "Scented Candle Gift Box",
    platform: StorePlatform.AMAZON_SELLER,
    platformProductId: "AMZ-CANDLE-GIFT",
    priceAmount: "34.00",
    sku: "CANDLE-GIFT-AMZ",
    stockStatus: "instock",
  }),
  product({
    category: "Bundles",
    connectedStoreId: demoStoreIds.tiktok,
    currentStockQuantity: 7,
    name: "Small Space Styling Kit",
    platform: StorePlatform.TIKTOK_SHOP,
    platformProductId: "TT-STYLING-KIT",
    priceAmount: "68.00",
    sku: "STYLING-KIT-TT",
    stockStatus: "instock",
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
    "GB",
    "London",
  ),
  customer(
    "woo_cust_102",
    demoStoreIds.woo,
    StorePlatform.WOOCOMMERCE,
    "oliver.reed@example.test",
    "Oliver",
    "Reed",
    "GB",
    "Bristol",
  ),
  customer(
    "amz_cust_201",
    demoStoreIds.amazon,
    StorePlatform.AMAZON_SELLER,
    "sophia.patel@example.test",
    "Sophia",
    "Patel",
    "GB",
    "Manchester",
  ),
  customer(
    "amz_cust_202",
    demoStoreIds.amazon,
    StorePlatform.AMAZON_SELLER,
    "noah.evans@example.test",
    "Noah",
    "Evans",
    "GB",
    "Leeds",
  ),
  customer(
    "shop_cust_401",
    demoStoreIds.shopify,
    StorePlatform.SHOPIFY,
    "isla.wilson@example.test",
    "Isla",
    "Wilson",
    "GB",
    "Edinburgh",
  ),
  customer(
    "shop_cust_402",
    demoStoreIds.shopify,
    StorePlatform.SHOPIFY,
    "arthur.hughes@example.test",
    "Arthur",
    "Hughes",
    "GB",
    "Cardiff",
  ),
  customer(
    "tt_cust_301",
    demoStoreIds.tiktok,
    StorePlatform.TIKTOK_SHOP,
    "ava.morgan@example.test",
    "Ava",
    "Morgan",
    "GB",
    "Birmingham",
  ),
  customer(
    "tt_cust_302",
    demoStoreIds.tiktok,
    StorePlatform.TIKTOK_SHOP,
    "leo.turner@example.test",
    "Leo",
    "Turner",
    "GB",
    "Glasgow",
  ),
  customer(
    "woo_cust_103",
    demoStoreIds.woo,
    StorePlatform.WOOCOMMERCE,
    "grace.walker@example.test",
    "Grace",
    "Walker",
    "GB",
    "Liverpool",
  ),
  customer(
    "amz_cust_203",
    demoStoreIds.amazon,
    StorePlatform.AMAZON_SELLER,
    "evie.thomas@example.test",
    "Evie",
    "Thomas",
    "GB",
    "Nottingham",
  ),
  customer(
    "shop_cust_403",
    demoStoreIds.shopify,
    StorePlatform.SHOPIFY,
    "freddie.clark@example.test",
    "Freddie",
    "Clark",
    "GB",
    "Brighton",
  ),
  customer(
    "tt_cust_303",
    demoStoreIds.tiktok,
    StorePlatform.TIKTOK_SHOP,
    "mila.ward@example.test",
    "Mila",
    "Ward",
    "GB",
    "Newcastle",
  ),
] as const;

const adSpotlightOrders = [
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "evie.thomas@example.test",
    customerName: "Evie Thomas",
    items: [
      item("1", "AMZ-HOME-REFRESH", "HOME-REFRESH-AMZ", "Weekend Home Refresh Bundle", 3, "156.00"),
      item("2", "AMZ-CANDLE-GIFT", "CANDLE-GIFT-AMZ", "Scented Candle Gift Box", 4, "34.00"),
    ],
    orderedAt: todayEarly,
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-10010",
    platformOrderNumber: "AMZ-10010",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "freddie.clark@example.test",
    customerName: "Freddie Clark",
    items: [
      item("1", "SHOP-COTTON-TOWEL", "COTTON-TOWEL-SHOP", "Cotton Cloud Bath Towel Set", 5, "48.00"),
      item("2", "SHOP-BRASS-HANDLE", "BRASS-HANDLE-SHOP", "Brass Cabinet Handle Pack", 3, "29.00"),
    ],
    orderedAt: atHour(now, 9, 25),
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-1010",
    platformOrderNumber: "#1010",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "mila.ward@example.test",
    customerName: "Mila Ward",
    items: [
      item("1", "TT-STYLING-KIT", "STYLING-KIT-TT", "Small Space Styling Kit", 4, "68.00"),
      item("2", "TT-PANTRY-JARS", "PANTRY-JARS-TT", "Stackable Pantry Jar Trio", 6, "36.00"),
    ],
    orderedAt: atHour(now, 10, 55),
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-22010",
    platformOrderNumber: "TT-22010",
    status: "processing",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "grace.walker@example.test",
    customerName: "Grace Walker",
    items: [
      item("1", "WOO-AMBER-LAMP", "AMBER-LAMP-WOO", "Amber Bedside Lamp", 3, "72.00"),
      item("2", "WOO-WAFFLE-BLANKET", "WAFFLE-BLANKET-WOO", "Waffle Throw Blanket", 2, "58.00"),
    ],
    orderedAt: atHour(now, 11, 40),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10060",
    platformOrderNumber: "#10060",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "sophia.patel@example.test",
    customerName: "Sophia Patel",
    items: [item("1", "AMZ-CANDLE-GIFT", "CANDLE-GIFT-AMZ", "Scented Candle Gift Box", 8, "34.00")],
    orderedAt: atHour(now, 13, 5),
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-10011",
    platformOrderNumber: "AMZ-10011",
    status: "shipped",
  }),
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "isla.wilson@example.test",
    customerName: "Isla Wilson",
    items: [item("1", "SHOP-COTTON-TOWEL", "COTTON-TOWEL-SHOP", "Cotton Cloud Bath Towel Set", 3, "48.00")],
    orderedAt: atHour(now, 14, 10),
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-1011",
    platformOrderNumber: "#1011",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "ava.morgan@example.test",
    customerName: "Ava Morgan",
    items: [item("1", "TT-STYLING-KIT", "STYLING-KIT-TT", "Small Space Styling Kit", 2, "68.00")],
    orderedAt: atHour(now, 16, 5),
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-22011",
    platformOrderNumber: "TT-22011",
    status: "processing",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "amelia.brooks@example.test",
    customerName: "Amelia Brooks",
    items: [
      item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 2, "64.00"),
      item("2", "WOO-AMBER-LAMP", "AMBER-LAMP-WOO", "Amber Bedside Lamp", 1, "72.00"),
    ],
    orderedAt: atHour(now, 17, 50),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10061",
    platformOrderNumber: "#10061",
    status: "completed",
  }),
] as const;

const orders = [
  ...adSpotlightOrders,
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "isla.wilson@example.test",
    customerName: "Isla Wilson",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 4, "32.00"),
      item("2", "SHOP-MARBLE-TRAY", "MARBLE-TRAY-SHOP", "Marble Soap Tray", 2, "18.00"),
    ],
    orderedAt: todayEarly,
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-1005",
    platformOrderNumber: "#1005",
    status: "paid",
  }),
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
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "oliver.reed@example.test",
    customerName: "Oliver Reed",
    items: [
      item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 3, "64.00"),
      item("2", "WOO-LINEN-RUNNER", "LINEN-RUN-WOO", "Linen Table Runner", 2, "28.00"),
    ],
    orderedAt: todayMidday,
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10047",
    platformOrderNumber: "#10047",
    status: "completed",
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
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "noah.evans@example.test",
    customerName: "Noah Evans",
    items: [
      item("1", "AMZ-WALL-LIGHT-PAIR", "WALL-LIGHT-AMZ", "Nordic Wall Light Pair", 2, "119.00"),
    ],
    orderedAt: todayAfternoon,
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-10002",
    platformOrderNumber: "AMZ-10002",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "isla.wilson@example.test",
    customerName: "Isla Wilson",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 3, "32.00"),
      item("2", "SHOP-MARBLE-TRAY", "MARBLE-TRAY-SHOP", "Marble Soap Tray", 2, "18.00"),
    ],
    orderedAt: todayAfternoon,
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-1001",
    platformOrderNumber: "#1001",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "leo.turner@example.test",
    customerName: "Leo Turner",
    items: [
      item("1", "TT-GLOW-KIT", "GLOW-KIT-TT", "Glow Kitchen Starter Kit", 6, "42.00"),
      item("2", "TT-VASE-MINI", "VASE-MINI-TT", "Mini Ceramic Vase Set", 2, "24.00"),
    ],
    orderedAt: todayEvening,
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-22002",
    platformOrderNumber: "TT-22002",
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
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "arthur.hughes@example.test",
    customerName: "Arthur Hughes",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 2, "32.00"),
    ],
    orderedAt: todayEvening,
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-1006",
    platformOrderNumber: "#1006",
    status: "paid",
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
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "arthur.hughes@example.test",
    customerName: "Arthur Hughes",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 1, "32.00"),
    ],
    orderedAt: yesterday,
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-1000",
    platformOrderNumber: "#1000",
    status: "paid",
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
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "isla.wilson@example.test",
    customerName: "Isla Wilson",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 2, "32.00"),
    ],
    orderedAt: addDays(atHour(now, 13, 20), -3),
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-0999",
    platformOrderNumber: "#0999",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "sophia.patel@example.test",
    customerName: "Sophia Patel",
    items: [item("1", "AMZ-AURORA-LAMP", "AUR-LAMP-AMZ", "Aurora Desk Lamp", 2, "89.00")],
    orderedAt: addDays(atHour(now, 16, 10), -4),
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-09972",
    platformOrderNumber: "AMZ-09972",
    status: "delivered",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "amelia.brooks@example.test",
    customerName: "Amelia Brooks",
    items: [item("1", "WOO-LINEN-RUNNER", "LINEN-RUN-WOO", "Linen Table Runner", 4, "28.00")],
    orderedAt: addDays(atHour(now, 9, 35), -5),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10043",
    platformOrderNumber: "#10043",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "ava.morgan@example.test",
    customerName: "Ava Morgan",
    items: [item("1", "TT-GLOW-KIT", "GLOW-KIT-TT", "Glow Kitchen Starter Kit", 4, "42.00")],
    orderedAt: addDays(atHour(now, 19, 5), -6),
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-21952",
    platformOrderNumber: "TT-21952",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "noah.evans@example.test",
    customerName: "Noah Evans",
    items: [
      item("1", "AMZ-WALL-LIGHT-PAIR", "WALL-LIGHT-AMZ", "Nordic Wall Light Pair", 1, "119.00"),
    ],
    orderedAt: addDays(atHour(now, 12, 45), -7),
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-09941",
    platformOrderNumber: "AMZ-09941",
    status: "delivered",
  }),
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "arthur.hughes@example.test",
    customerName: "Arthur Hughes",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 2, "32.00"),
      item("2", "SHOP-MARBLE-TRAY", "MARBLE-TRAY-SHOP", "Marble Soap Tray", 1, "18.00"),
    ],
    orderedAt: addDays(atHour(now, 15, 55), -9),
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-0993",
    platformOrderNumber: "#0993",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "oliver.reed@example.test",
    customerName: "Oliver Reed",
    items: [item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 3, "64.00")],
    orderedAt: addDays(atHour(now, 10, 50), -10),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10039",
    platformOrderNumber: "#10039",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "leo.turner@example.test",
    customerName: "Leo Turner",
    items: [item("1", "TT-VASE-MINI", "VASE-MINI-TT", "Mini Ceramic Vase Set", 3, "24.00")],
    orderedAt: addDays(atHour(now, 17, 40), -12),
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-21918",
    platformOrderNumber: "TT-21918",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "sophia.patel@example.test",
    customerName: "Sophia Patel",
    items: [
      item("1", "AMZ-AURORA-LAMP", "AUR-LAMP-AMZ", "Aurora Desk Lamp", 1, "89.00"),
      item("2", "AMZ-WALL-LIGHT-PAIR", "WALL-LIGHT-AMZ", "Nordic Wall Light Pair", 1, "119.00"),
    ],
    orderedAt: addDays(atHour(now, 14, 15), -13),
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-09908",
    platformOrderNumber: "AMZ-09908",
    status: "delivered",
  }),
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "isla.wilson@example.test",
    customerName: "Isla Wilson",
    items: [item("1", "SHOP-MARBLE-TRAY", "MARBLE-TRAY-SHOP", "Marble Soap Tray", 5, "18.00")],
    orderedAt: addDays(atHour(now, 11, 25), -15),
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-0988",
    platformOrderNumber: "#0988",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "amelia.brooks@example.test",
    customerName: "Amelia Brooks",
    items: [
      item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 1, "64.00"),
      item("2", "WOO-LINEN-RUNNER", "LINEN-RUN-WOO", "Linen Table Runner", 2, "28.00"),
    ],
    orderedAt: addDays(atHour(now, 18, 5), -16),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10034",
    platformOrderNumber: "#10034",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "ava.morgan@example.test",
    customerName: "Ava Morgan",
    items: [item("1", "TT-GLOW-KIT", "GLOW-KIT-TT", "Glow Kitchen Starter Kit", 3, "42.00")],
    orderedAt: addDays(atHour(now, 20, 15), -18),
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-21882",
    platformOrderNumber: "TT-21882",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "noah.evans@example.test",
    customerName: "Noah Evans",
    items: [item("1", "AMZ-AURORA-LAMP", "AUR-LAMP-AMZ", "Aurora Desk Lamp", 1, "89.00")],
    orderedAt: addDays(atHour(now, 9, 50), -20),
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-09874",
    platformOrderNumber: "AMZ-09874",
    status: "delivered",
  }),
  order({
    connectedStoreId: demoStoreIds.shopify,
    customerEmail: "arthur.hughes@example.test",
    customerName: "Arthur Hughes",
    items: [
      item("1", "SHOP-BAMBOO-DIVIDER", "BAMBOO-DIV-SHOP", "Bamboo Drawer Divider", 4, "32.00"),
    ],
    orderedAt: addDays(atHour(now, 13, 35), -22),
    platform: StorePlatform.SHOPIFY,
    platformOrderId: "SHOP-0981",
    platformOrderNumber: "#0981",
    status: "paid",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "oliver.reed@example.test",
    customerName: "Oliver Reed",
    items: [item("1", "WOO-LINEN-RUNNER", "LINEN-RUN-WOO", "Linen Table Runner", 2, "28.00")],
    orderedAt: addDays(atHour(now, 16, 30), -24),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10029",
    platformOrderNumber: "#10029",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.tiktok,
    customerEmail: "leo.turner@example.test",
    customerName: "Leo Turner",
    items: [
      item("1", "TT-GLOW-KIT", "GLOW-KIT-TT", "Glow Kitchen Starter Kit", 1, "42.00"),
      item("2", "TT-VASE-MINI", "VASE-MINI-TT", "Mini Ceramic Vase Set", 2, "24.00"),
    ],
    orderedAt: addDays(atHour(now, 18, 55), -26),
    platform: StorePlatform.TIKTOK_SHOP,
    platformOrderId: "TT-21830",
    platformOrderNumber: "TT-21830",
    status: "completed",
  }),
  order({
    connectedStoreId: demoStoreIds.amazon,
    customerEmail: "sophia.patel@example.test",
    customerName: "Sophia Patel",
    items: [
      item("1", "AMZ-WALL-LIGHT-PAIR", "WALL-LIGHT-AMZ", "Nordic Wall Light Pair", 1, "119.00"),
    ],
    orderedAt: addDays(atHour(now, 12, 5), -28),
    platform: StorePlatform.AMAZON_SELLER,
    platformOrderId: "AMZ-09825",
    platformOrderNumber: "AMZ-09825",
    status: "delivered",
  }),
  order({
    connectedStoreId: demoStoreIds.woo,
    customerEmail: "amelia.brooks@example.test",
    customerName: "Amelia Brooks",
    items: [item("1", "WOO-OAK-PANTRY", "OAK-PANTRY-WOO", "Oak Pantry Organiser", 2, "64.00")],
    orderedAt: addDays(atHour(now, 11, 10), -30),
    platform: StorePlatform.WOOCOMMERCE,
    platformOrderId: "10024",
    platformOrderNumber: "#10024",
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
    await Promise.all(
      customers
        .filter((customerRecord) => activeSeedStoreIds.has(customerRecord.connectedStoreId))
        .map((customerRecord) => createCustomer(prisma, customerRecord)),
    );
    await Promise.all(
      categories.flatMap((categoryRecord) =>
        stores.map((store) => createCategory(prisma, store, categoryRecord)),
      ),
    );
    await Promise.all(
      products
        .filter((productRecord) => activeSeedStoreIds.has(productRecord.connectedStoreId))
        .map((productRecord) => createProduct(prisma, productRecord)),
    );
    await Promise.all(
      products
        .filter((productRecord) => activeSeedStoreIds.has(productRecord.connectedStoreId))
        .map((productRecord) => createInventorySnapshot(prisma, productRecord)),
    );

    for (const orderRecord of orders.filter((orderSeed) =>
      activeSeedStoreIds.has(orderSeed.connectedStoreId),
    )) {
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
      sourceMetadata: sourceMetadata(customerRecord.platform, {
        billing: {
          city: customerRecord.city,
          country: customerRecord.country,
          email: customerRecord.email,
          first_name: customerRecord.firstName,
          last_name: customerRecord.lastName,
        },
        demoCustomer: true,
      }),
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
  const shopifyOrder = await prisma.commerceOrder.findUnique({
    where: {
      connectedStoreId_platformOrderId: {
        connectedStoreId: demoStoreIds.shopify,
        platformOrderId: "SHOP-1001",
      },
    },
    select: { id: true },
  });

  await prisma.commerceRefund.create({
    data: {
      amount: "18.00",
      businessId: demoBusiness.id,
      commerceOrderId: shopifyOrder?.id,
      connectedStoreId: demoStoreIds.shopify,
      currency: "GBP",
      lastSyncedAt: syncTime,
      platform: StorePlatform.SHOPIFY,
      platformOrderId: "SHOP-1001",
      platformRefundId: "SHOP-REF-1001-1",
      reason: "Demo partial refund for one marble soap tray",
      refundedAt: todayAfternoon,
      refundStatus: "completed",
      sourceMetadata: sourceMetadata(StorePlatform.SHOPIFY, { demoRefund: true }),
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
  country: string,
  city: string,
): CustomerSeed {
  return {
    city,
    connectedStoreId,
    country,
    email,
    firstName,
    lastName,
    platform,
    platformCustomerId,
  };
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
  readonly city: string;
  readonly connectedStoreId: string;
  readonly country: string;
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
