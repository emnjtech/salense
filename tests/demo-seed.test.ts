import { readFileSync } from "node:fs";
import { join } from "node:path";

const seedScript = readFileSync(join(process.cwd(), "scripts", "seed.ts"), "utf8");

describe("MVP demo seed script", () => {
  it("includes all MVP commerce platforms", () => {
    expect(seedScript).toContain("StorePlatform.WOOCOMMERCE");
    expect(seedScript).toContain("StorePlatform.AMAZON_SELLER");
    expect(seedScript).toContain("StorePlatform.TIKTOK_SHOP");
    expect(seedScript).toContain("StorePlatform.SHOPIFY");
  });

  it("marks source metadata as demo seed origin", () => {
    expect(seedScript).toContain("salense_mvp_demo_seed");
    expect(seedScript).toContain("origin");
  });

  it("does not include marketplace credential fields", () => {
    expect(seedScript).not.toMatch(/consumer(Key|Secret)/u);
    expect(seedScript).not.toMatch(/marketplace password/iu);
    expect(seedScript).not.toMatch(/admin password/iu);
  });
});
