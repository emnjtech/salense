import { readFileSync } from "node:fs";
import { join } from "node:path";

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

describe("commerce sync cursor schema", () => {
  it("defines per-store resource cursor persistence", () => {
    const model = getModelBlock("CommerceSyncCursor");

    expect(schema).toContain("enum CommerceSyncResource {");
    expect(schema).toContain("ORDERS");
    expect(schema).toContain("PRODUCTS");
    expect(schema).toContain("CUSTOMERS");
    expect(schema).toContain("INVENTORY");
    expect(schema).toContain("CATEGORIES");
    expect(schema).toContain("REFUNDS");
    expect(model).toContain("businessId");
    expect(model).toContain("connectedStoreId");
    expect(model).toMatch(/platform\s+StorePlatform/);
    expect(model).toMatch(/resource\s+CommerceSyncResource/);
    expect(model).toContain("lastSuccessfulSyncedAt");
    expect(model).toContain("lastAttemptedSyncedAt");
    expect(model).toMatch(/status\s+CommerceSyncCursorStatus/);
    expect(model).toContain("errorMetadata");
  });

  it("prevents duplicate cursors and indexes incremental lookup fields", () => {
    const model = getModelBlock("CommerceSyncCursor");

    expect(model).toContain("@@unique([connectedStoreId, resource])");
    expect(model).toContain("@@index([businessId])");
    expect(model).toContain("@@index([connectedStoreId])");
    expect(model).toContain("@@index([platform])");
    expect(model).toContain("@@index([resource])");
    expect(model).toContain("@@index([lastSuccessfulSyncedAt])");
    expect(model).toContain("@@index([lastAttemptedSyncedAt])");
  });
});

function getModelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));

  if (!match) {
    throw new Error(`Model ${modelName} was not found in schema.prisma.`);
  }

  return match[0];
}
