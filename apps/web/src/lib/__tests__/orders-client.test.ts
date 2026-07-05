import { createOrdersApiClient } from "../api/orders-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("orders API client", () => {
  it("loads filtered orders with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ orders: [] }));
    const client = createOrdersApiClient({ baseUrl: "https://api.salense.test/", fetchImpl });

    await client.listOrders("access-token", {
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-03T23:59:59.999Z",
      platform: StorePlatform.WooCommerce,
      status: "processing",
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/commerce/orders?platform=WOOCOMMERCE&status=processing&dateFrom=2026-07-01T00%3A00%3A00.000Z&dateTo=2026-07-03T23%3A59%3A59.999Z",
    );
    expect(getAuthorization(fetchImpl.mock.calls[0]?.[1])).toBe("Bearer access-token");
  });

  it("maps API errors safely", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unauthorized" }, false, 401));
    const client = createOrdersApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.listOrders("expired-token")).rejects.toThrow("Unauthorized");
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}

function getAuthorization(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("authorization");
}
