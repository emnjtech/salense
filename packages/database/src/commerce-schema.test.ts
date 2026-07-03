import { readFileSync } from "node:fs";
import { join } from "node:path";

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const commerceModels = [
  "CommerceOrder",
  "CommerceOrderItem",
  "CommerceProduct",
  "CommerceCustomer",
  "CommerceInventorySnapshot",
  "CommerceCategory",
  "CommerceRefund",
] as const;

describe("commerce persistence schema", () => {
  it("defines the Version 1 commerce models", () => {
    for (const modelName of commerceModels) {
      expect(schema).toContain(`model ${modelName} {`);
    }
  });

  it("preserves source identity on every commerce model", () => {
    for (const modelName of commerceModels) {
      const model = getModelBlock(modelName);

      expect(model).toContain("businessId");
      expect(model).toContain("connectedStoreId");
      expect(model).toMatch(/platform\s+StorePlatform/);
      expect(model).toContain("sourceMetadata");
      expect(model).toContain("importedAt");
      expect(model).toContain("lastSyncedAt");
    }
  });

  it("prevents duplicate imports with platform-scoped uniqueness", () => {
    expect(getModelBlock("CommerceOrder")).toContain("@@unique([connectedStoreId, platformOrderId])");
    expect(getModelBlock("CommerceOrderItem")).toContain(
      "@@unique([commerceOrderId, platformOrderItemId])",
    );
    expect(getModelBlock("CommerceProduct")).toContain(
      "@@unique([connectedStoreId, platformProductId])",
    );
    expect(getModelBlock("CommerceCustomer")).toContain(
      "@@unique([connectedStoreId, platformCustomerId])",
    );
    expect(getModelBlock("CommerceInventorySnapshot")).toContain(
      "@@unique([connectedStoreId, platformProductId, capturedAt])",
    );
    expect(getModelBlock("CommerceCategory")).toContain(
      "@@unique([connectedStoreId, platformCategoryId])",
    );
    expect(getModelBlock("CommerceRefund")).toContain(
      "@@unique([connectedStoreId, platformRefundId])",
    );
  });

  it("adds dashboard-oriented query indexes", () => {
    expect(getModelBlock("CommerceOrder")).toContain("@@index([businessId, orderedAt])");
    expect(getModelBlock("CommerceProduct")).toContain("@@index([sku])");
    expect(getModelBlock("CommerceProduct")).toContain("@@index([platformProductId])");
    expect(getModelBlock("CommerceCustomer")).toContain("@@index([email])");
    expect(getModelBlock("CommerceCustomer")).toContain("@@index([platformCustomerId])");
    expect(getModelBlock("CommerceOrder")).toContain("@@index([orderStatus])");
    expect(getModelBlock("CommerceRefund")).toContain("@@index([refundStatus])");
    expect(getModelBlock("CommerceInventorySnapshot")).toContain("@@index([stockStatus])");
  });
});

function getModelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));

  if (!match) {
    throw new Error(`Model ${modelName} was not found in schema.prisma.`);
  }

  return match[0];
}
