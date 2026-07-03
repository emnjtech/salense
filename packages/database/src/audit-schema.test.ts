import { readFileSync } from "node:fs";
import { join } from "node:path";

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

describe("audit log schema", () => {
  it("defines append-only audit fields required by Chapter 6.18", () => {
    const model = getModelBlock("AuditLog");

    expect(model).toContain("userId");
    expect(model).toContain("businessId");
    expect(model).toContain("action");
    expect(model).toContain("affectedModule");
    expect(model).toContain("affectedStoreId");
    expect(model).toMatch(/affectedPlatform\s+StorePlatform\?/);
    expect(model).toContain("result");
    expect(model).toContain("metadata");
    expect(model).toContain("createdAt");
  });

  it("indexes audit lookup dimensions without adding mutation-oriented fields", () => {
    const model = getModelBlock("AuditLog");

    expect(model).toContain("@@index([userId])");
    expect(model).toContain("@@index([businessId])");
    expect(model).toContain("@@index([action])");
    expect(model).toContain("@@index([affectedStoreId])");
    expect(model).toContain("@@index([affectedPlatform])");
    expect(model).toContain("@@index([createdAt])");
    expect(model).not.toContain("updatedAt");
    expect(model).not.toContain("deletedAt");
  });
});

function getModelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));

  if (!match) {
    throw new Error(`Model ${modelName} was not found in schema.prisma.`);
  }

  return match[0];
}
