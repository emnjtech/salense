import { createCustomersApiClient } from "../api/customers-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("customers API client", () => {
  it("loads filtered customers with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          customers: [],
          summary: { highestLifetimeCustomer: null, newCustomers: 0, returningCustomers: 0 },
        }),
      );
    const client = createCustomersApiClient({ baseUrl: "https://api.salense.test/", fetchImpl });

    await client.listCustomers("access-token", {
      country: "GB",
      platform: StorePlatform.WooCommerce,
      search: "ada lovelace",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.salense.test/commerce/customers?platform=WOOCOMMERCE&country=GB&search=ada+lovelace",
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
    const client = createCustomersApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.listCustomers("expired-token")).rejects.toThrow("Unauthorized");
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
