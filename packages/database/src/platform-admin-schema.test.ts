import { readFileSync } from "node:fs";
import { join } from "node:path";

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

describe("platform administration schema", () => {
  it("keeps platform administration separate from business ownership", () => {
    const userModel = getBlock("model User");
    const businessModel = getBlock("model Business");

    expect(schema).toContain("enum PlatformRole");
    expect(schema).toContain("SUPER_ADMIN");
    expect(userModel).toContain("platformRole    PlatformRole?");
    expect(businessModel).toContain("ownerId");
    expect(businessModel).not.toContain("platformRole");
  });

  it("stores invitation tokens as hashed, expiring, single-use fields", () => {
    const invitationModel = getBlock("model SubscriptionInvitation");

    expect(invitationModel).toContain("invitationTokenHash      String?   @unique");
    expect(invitationModel).toContain("invitationTokenExpiresAt DateTime?");
    expect(invitationModel).toContain("invitationTokenUsedAt    DateTime?");
    expect(invitationModel).toContain("archivedAt               DateTime?");
    expect(invitationModel).toContain('status                   String    @default("PENDING")');
  });
});

function getBlock(blockName: string): string {
  const match = schema.match(new RegExp(`${blockName} \\{[\\s\\S]*?\\n\\}`));

  if (!match) {
    throw new Error(`${blockName} was not found in schema.prisma.`);
  }

  return match[0];
}
