import { createProductsApiClient } from "../api/products-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("products API client", () => {
  it("loads filtered products with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ products: [] }));
    const client = createProductsApiClient({ baseUrl: "https://api.salense.test/", fetchImpl });

    await client.listProducts("access-token", {
      platform: StorePlatform.WooCommerce,
      search: "trail shoe",
      stockStatus: "instock",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.salense.test/commerce/products?platform=WOOCOMMERCE&stockStatus=instock&search=trail+shoe",
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
    const client = createProductsApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.listProducts("expired-token")).rejects.toThrow("Unauthorized");
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
