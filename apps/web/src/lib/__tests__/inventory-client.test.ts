import { createInventoryApiClient } from "../api/inventory-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("inventory API client", () => {
  it("loads filtered inventory with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          insights: [],
          inventory: [],
          summary: { inventoryValue: 0, lowStockProducts: 0, outOfStockProducts: 0 },
        }),
      );
    const client = createInventoryApiClient({ baseUrl: "https://api.salense.test/", fetchImpl });

    await client.listInventory("access-token", {
      category: "Lighting",
      platform: StorePlatform.WooCommerce,
      search: "desk lamp",
      stockStatus: "lowstock",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.salense.test/commerce/inventory?platform=WOOCOMMERCE&stockStatus=lowstock&category=Lighting&search=desk+lamp",
      {
        headers: {
          authorization: "Bearer access-token",
        },
      },
    );
  });

  it("maps API errors safely", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unauthorized" }, false, 401));
    const client = createInventoryApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.listInventory("expired-token")).rejects.toThrow("Unauthorized");
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
