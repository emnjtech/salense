-- CreateEnum
CREATE TYPE "StorePlatform" AS ENUM ('WOOCOMMERCE', 'AMAZON_SELLER', 'TIKTOK_SHOP', 'SHOPIFY');

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "StoreConnectionStatus" AS ENUM ('PENDING_VALIDATION', 'CONNECTED', 'SYNCHRONISING', 'DISCONNECTED', 'AUTHENTICATION_EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "CommerceSyncResource" AS ENUM ('ORDERS', 'PRODUCTS', 'CUSTOMERS', 'INVENTORY', 'CATEGORIES', 'REFUNDS');

-- CreateEnum
CREATE TYPE "CommerceSyncCursorStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "businessLogoUrl" TEXT,
    "country" TEXT,
    "timeZone" TEXT,
    "currency" TEXT,
    "taxPreference" TEXT,
    "industry" TEXT,
    "businessSize" TEXT,
    "defaultReportingPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_refresh_tokens" (
    "id" TEXT NOT NULL,
    "platformAdminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_stores" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeUrl" TEXT,
    "region" TEXT,
    "connectionStatus" "StoreConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessTokenHash" TEXT,
    "accessTokenMetadata" JSONB,
    "refreshTokenHash" TEXT,
    "refreshTokenMetadata" JSONB,
    "lastSynchronisedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_orders" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "platformOrderId" TEXT NOT NULL,
    "platformOrderNumber" TEXT,
    "orderStatus" TEXT,
    "currency" TEXT,
    "subtotalAmount" DECIMAL(65,30),
    "totalAmount" DECIMAL(65,30),
    "taxAmount" DECIMAL(65,30),
    "shippingAmount" DECIMAL(65,30),
    "discountAmount" DECIMAL(65,30),
    "refundedAmount" DECIMAL(65,30),
    "orderedAt" TIMESTAMP(3),
    "platformCreatedAt" TIMESTAMP(3),
    "platformUpdatedAt" TIMESTAMP(3),
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_order_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "commerceOrderId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "platformOrderItemId" TEXT NOT NULL,
    "platformProductId" TEXT,
    "platformVariationId" TEXT,
    "sku" TEXT,
    "name" TEXT,
    "quantity" INTEGER,
    "unitPriceAmount" DECIMAL(65,30),
    "subtotalAmount" DECIMAL(65,30),
    "totalAmount" DECIMAL(65,30),
    "taxAmount" DECIMAL(65,30),
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "platformVariationId" TEXT,
    "sku" TEXT,
    "name" TEXT,
    "productType" TEXT,
    "productStatus" TEXT,
    "currency" TEXT,
    "priceAmount" DECIMAL(65,30),
    "regularPriceAmount" DECIMAL(65,30),
    "salePriceAmount" DECIMAL(65,30),
    "stockStatus" TEXT,
    "currentStockQuantity" INTEGER,
    "platformCreatedAt" TIMESTAMP(3),
    "platformUpdatedAt" TIMESTAMP(3),
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_customers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "platformCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "customerRole" TEXT,
    "platformCreatedAt" TIMESTAMP(3),
    "platformUpdatedAt" TIMESTAMP(3),
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_inventory_snapshots" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "sku" TEXT,
    "stockQuantity" INTEGER,
    "stockStatus" TEXT,
    "manageStock" BOOLEAN,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_inventory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "platformCategoryId" TEXT NOT NULL,
    "platformParentCategoryId" TEXT,
    "name" TEXT,
    "slug" TEXT,
    "productCount" INTEGER,
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_refunds" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "commerceOrderId" TEXT,
    "platform" "StorePlatform" NOT NULL,
    "platformRefundId" TEXT NOT NULL,
    "platformOrderId" TEXT,
    "refundStatus" TEXT,
    "reason" TEXT,
    "currency" TEXT,
    "amount" DECIMAL(65,30),
    "refundedAt" TIMESTAMP(3),
    "sourceMetadata" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_sync_cursors" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "connectedStoreId" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "resource" "CommerceSyncResource" NOT NULL,
    "lastSuccessfulSyncedAt" TIMESTAMP(3),
    "lastAttemptedSyncedAt" TIMESTAMP(3),
    "status" "CommerceSyncCursorStatus" NOT NULL,
    "errorMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "affectedModule" TEXT NOT NULL,
    "affectedStoreId" TEXT,
    "affectedPlatform" "StorePlatform",
    "result" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invitations" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "websiteUrl" TEXT,
    "preferredPlan" TEXT NOT NULL,
    "platforms" JSONB NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitationTokenHash" TEXT,
    "invitationTokenExpiresAt" TIMESTAMP(3),
    "invitationTokenUsedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_ownerId_key" ON "businesses"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_admins_email_idx" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_admins_role_idx" ON "platform_admins"("role");

-- CreateIndex
CREATE INDEX "platform_admins_status_idx" ON "platform_admins"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_refresh_tokens_tokenHash_key" ON "platform_admin_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "platform_admin_refresh_tokens_platformAdminId_idx" ON "platform_admin_refresh_tokens"("platformAdminId");

-- CreateIndex
CREATE INDEX "platform_admin_refresh_tokens_expiresAt_idx" ON "platform_admin_refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "platform_admin_refresh_tokens_revokedAt_idx" ON "platform_admin_refresh_tokens"("revokedAt");

-- CreateIndex
CREATE INDEX "connected_stores_businessId_idx" ON "connected_stores"("businessId");

-- CreateIndex
CREATE INDEX "connected_stores_platform_idx" ON "connected_stores"("platform");

-- CreateIndex
CREATE INDEX "connected_stores_connectionStatus_idx" ON "connected_stores"("connectionStatus");

-- CreateIndex
CREATE INDEX "connected_stores_lastSynchronisedAt_idx" ON "connected_stores"("lastSynchronisedAt");

-- CreateIndex
CREATE UNIQUE INDEX "connected_stores_businessId_platform_storeUrl_region_key" ON "connected_stores"("businessId", "platform", "storeUrl", "region");

-- CreateIndex
CREATE INDEX "commerce_orders_businessId_idx" ON "commerce_orders"("businessId");

-- CreateIndex
CREATE INDEX "commerce_orders_connectedStoreId_idx" ON "commerce_orders"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_orders_platform_idx" ON "commerce_orders"("platform");

-- CreateIndex
CREATE INDEX "commerce_orders_orderedAt_idx" ON "commerce_orders"("orderedAt");

-- CreateIndex
CREATE INDEX "commerce_orders_orderStatus_idx" ON "commerce_orders"("orderStatus");

-- CreateIndex
CREATE INDEX "commerce_orders_businessId_orderedAt_idx" ON "commerce_orders"("businessId", "orderedAt");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_connectedStoreId_platformOrderId_key" ON "commerce_orders"("connectedStoreId", "platformOrderId");

-- CreateIndex
CREATE INDEX "commerce_order_items_businessId_idx" ON "commerce_order_items"("businessId");

-- CreateIndex
CREATE INDEX "commerce_order_items_connectedStoreId_idx" ON "commerce_order_items"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_order_items_platform_idx" ON "commerce_order_items"("platform");

-- CreateIndex
CREATE INDEX "commerce_order_items_platformProductId_idx" ON "commerce_order_items"("platformProductId");

-- CreateIndex
CREATE INDEX "commerce_order_items_sku_idx" ON "commerce_order_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_order_items_commerceOrderId_platformOrderItemId_key" ON "commerce_order_items"("commerceOrderId", "platformOrderItemId");

-- CreateIndex
CREATE INDEX "commerce_products_businessId_idx" ON "commerce_products"("businessId");

-- CreateIndex
CREATE INDEX "commerce_products_connectedStoreId_idx" ON "commerce_products"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_products_platform_idx" ON "commerce_products"("platform");

-- CreateIndex
CREATE INDEX "commerce_products_platformProductId_idx" ON "commerce_products"("platformProductId");

-- CreateIndex
CREATE INDEX "commerce_products_sku_idx" ON "commerce_products"("sku");

-- CreateIndex
CREATE INDEX "commerce_products_productStatus_idx" ON "commerce_products"("productStatus");

-- CreateIndex
CREATE INDEX "commerce_products_stockStatus_idx" ON "commerce_products"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_products_connectedStoreId_platformProductId_key" ON "commerce_products"("connectedStoreId", "platformProductId");

-- CreateIndex
CREATE INDEX "commerce_customers_businessId_idx" ON "commerce_customers"("businessId");

-- CreateIndex
CREATE INDEX "commerce_customers_connectedStoreId_idx" ON "commerce_customers"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_customers_platform_idx" ON "commerce_customers"("platform");

-- CreateIndex
CREATE INDEX "commerce_customers_platformCustomerId_idx" ON "commerce_customers"("platformCustomerId");

-- CreateIndex
CREATE INDEX "commerce_customers_email_idx" ON "commerce_customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_customers_connectedStoreId_platformCustomerId_key" ON "commerce_customers"("connectedStoreId", "platformCustomerId");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_businessId_idx" ON "commerce_inventory_snapshots"("businessId");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_connectedStoreId_idx" ON "commerce_inventory_snapshots"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_platform_idx" ON "commerce_inventory_snapshots"("platform");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_platformProductId_idx" ON "commerce_inventory_snapshots"("platformProductId");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_sku_idx" ON "commerce_inventory_snapshots"("sku");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_stockStatus_idx" ON "commerce_inventory_snapshots"("stockStatus");

-- CreateIndex
CREATE INDEX "commerce_inventory_snapshots_capturedAt_idx" ON "commerce_inventory_snapshots"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_inventory_snapshots_connectedStoreId_platformProdu_key" ON "commerce_inventory_snapshots"("connectedStoreId", "platformProductId", "capturedAt");

-- CreateIndex
CREATE INDEX "commerce_categories_businessId_idx" ON "commerce_categories"("businessId");

-- CreateIndex
CREATE INDEX "commerce_categories_connectedStoreId_idx" ON "commerce_categories"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_categories_platform_idx" ON "commerce_categories"("platform");

-- CreateIndex
CREATE INDEX "commerce_categories_platformCategoryId_idx" ON "commerce_categories"("platformCategoryId");

-- CreateIndex
CREATE INDEX "commerce_categories_platformParentCategoryId_idx" ON "commerce_categories"("platformParentCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_categories_connectedStoreId_platformCategoryId_key" ON "commerce_categories"("connectedStoreId", "platformCategoryId");

-- CreateIndex
CREATE INDEX "commerce_refunds_businessId_idx" ON "commerce_refunds"("businessId");

-- CreateIndex
CREATE INDEX "commerce_refunds_connectedStoreId_idx" ON "commerce_refunds"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_refunds_platform_idx" ON "commerce_refunds"("platform");

-- CreateIndex
CREATE INDEX "commerce_refunds_platformRefundId_idx" ON "commerce_refunds"("platformRefundId");

-- CreateIndex
CREATE INDEX "commerce_refunds_platformOrderId_idx" ON "commerce_refunds"("platformOrderId");

-- CreateIndex
CREATE INDEX "commerce_refunds_refundStatus_idx" ON "commerce_refunds"("refundStatus");

-- CreateIndex
CREATE INDEX "commerce_refunds_refundedAt_idx" ON "commerce_refunds"("refundedAt");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_refunds_connectedStoreId_platformRefundId_key" ON "commerce_refunds"("connectedStoreId", "platformRefundId");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_businessId_idx" ON "commerce_sync_cursors"("businessId");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_connectedStoreId_idx" ON "commerce_sync_cursors"("connectedStoreId");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_platform_idx" ON "commerce_sync_cursors"("platform");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_resource_idx" ON "commerce_sync_cursors"("resource");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_status_idx" ON "commerce_sync_cursors"("status");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_lastSuccessfulSyncedAt_idx" ON "commerce_sync_cursors"("lastSuccessfulSyncedAt");

-- CreateIndex
CREATE INDEX "commerce_sync_cursors_lastAttemptedSyncedAt_idx" ON "commerce_sync_cursors"("lastAttemptedSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_sync_cursors_connectedStoreId_resource_key" ON "commerce_sync_cursors"("connectedStoreId", "resource");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_idx" ON "audit_logs"("businessId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_affectedModule_idx" ON "audit_logs"("affectedModule");

-- CreateIndex
CREATE INDEX "audit_logs_affectedStoreId_idx" ON "audit_logs"("affectedStoreId");

-- CreateIndex
CREATE INDEX "audit_logs_affectedPlatform_idx" ON "audit_logs"("affectedPlatform");

-- CreateIndex
CREATE INDEX "audit_logs_result_idx" ON "audit_logs"("result");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invitations_invitationTokenHash_key" ON "subscription_invitations"("invitationTokenHash");

-- CreateIndex
CREATE INDEX "subscription_invitations_workEmail_idx" ON "subscription_invitations"("workEmail");

-- CreateIndex
CREATE INDEX "subscription_invitations_preferredPlan_idx" ON "subscription_invitations"("preferredPlan");

-- CreateIndex
CREATE INDEX "subscription_invitations_status_idx" ON "subscription_invitations"("status");

-- CreateIndex
CREATE INDEX "subscription_invitations_invitationTokenExpiresAt_idx" ON "subscription_invitations"("invitationTokenExpiresAt");

-- CreateIndex
CREATE INDEX "subscription_invitations_createdAt_idx" ON "subscription_invitations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expiresAt_idx" ON "email_verification_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_revokedAt_idx" ON "refresh_tokens"("revokedAt");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin_refresh_tokens" ADD CONSTRAINT "platform_admin_refresh_tokens_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_stores" ADD CONSTRAINT "connected_stores_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_commerceOrderId_fkey" FOREIGN KEY ("commerceOrderId") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_products" ADD CONSTRAINT "commerce_products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_products" ADD CONSTRAINT "commerce_products_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_customers" ADD CONSTRAINT "commerce_customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_customers" ADD CONSTRAINT "commerce_customers_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_inventory_snapshots" ADD CONSTRAINT "commerce_inventory_snapshots_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_inventory_snapshots" ADD CONSTRAINT "commerce_inventory_snapshots_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_categories" ADD CONSTRAINT "commerce_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_categories" ADD CONSTRAINT "commerce_categories_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_commerceOrderId_fkey" FOREIGN KEY ("commerceOrderId") REFERENCES "commerce_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_sync_cursors" ADD CONSTRAINT "commerce_sync_cursors_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_sync_cursors" ADD CONSTRAINT "commerce_sync_cursors_connectedStoreId_fkey" FOREIGN KEY ("connectedStoreId") REFERENCES "connected_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

