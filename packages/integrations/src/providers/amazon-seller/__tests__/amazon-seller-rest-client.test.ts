import {
  AmazonSellerApiRegion,
  AmazonSellerRestClient,
  ConnectionHealthStatus,
  IntegrationAuthenticationError,
  type AmazonSellerRawOrder,
} from "../../../index.js";

const request = {
  accessToken: "access-token",
  marketplaceId: "A1F83G8C2ARO7P",
  region: AmazonSellerApiRegion.Europe,
  sellerId: "seller_123",
};

describe("AmazonSellerRestClient", () => {
  it("validates connections through a read-only marketplace participation request", async () => {
    const fetchImpl = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      jsonResponse({ payload: [{ marketplace: { id: "A1F83G8C2ARO7P" } }] }),
    );
    const client = new AmazonSellerRestClient({ fetchFn: fetchImpl });

    await expect(client.validateConnection(request)).resolves.toMatchObject({
      status: ConnectionHealthStatus.Healthy,
    });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://sellingpartnerapi-eu.amazon.com/sellers/v1/marketplaceParticipations",
    );
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer access-token",
        "x-amz-access-token": "access-token",
      }),
    );
  });

  it("reads paginated orders without write operations", async () => {
    const firstOrder: AmazonSellerRawOrder = { AmazonOrderId: "order_1" };
    const secondOrder: AmazonSellerRawOrder = { AmazonOrderId: "order_2" };
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse({ payload: { NextToken: "next", Orders: [firstOrder] } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { Orders: [secondOrder] } }));
    const client = new AmazonSellerRestClient({ fetchFn: fetchImpl });

    await expect(client.listOrders({ ...request, maxPages: 2 })).resolves.toEqual([
      firstOrder,
      secondOrder,
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "GET"]);
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("NextToken=next");
  });

  it("maps authentication failures to integration authentication errors", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
    const client = new AmazonSellerRestClient({ fetchFn: fetchImpl });

    await expect(client.validateConnection(request)).rejects.toThrow(IntegrationAuthenticationError);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}
