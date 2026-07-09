import {
  IntegrationAuthenticationError,
  IntegrationConnectionError,
  WooCommerceApiVersion,
  WooCommerceRestClient,
} from "../../../index.js";

const validationRequest = {
  storeUrl: "https://shop.example.com",
  consumerKey: "ck_live_placeholder",
  consumerSecret: "cs_live_placeholder",
  apiVersion: WooCommerceApiVersion.WcV3,
};

describe("WooCommerceRestClient", () => {
  it("validates credentials with a read-only orders request", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(client.validateConnection(validationRequest)).resolves.toMatchObject({
      status: "HEALTHY",
      message: "WooCommerce credentials validated successfully.",
      metadata: { endpoint: "/wp-json/wc/v3/orders", readOnly: true },
    });

    expect(fetchFn).toHaveBeenCalledWith(
      new URL("https://shop.example.com/wp-json/wc/v3/orders?page=1&per_page=1"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: expect.stringMatching(/^Basic /),
        }),
      }),
    );
    expect(fetchFn).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "POST" }));
    expect(fetchFn).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "PUT" }));
    expect(fetchFn).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "DELETE" }));
  });

  it("reads orders with pagination and incremental parameters", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(createJsonResponse([{ id: 1 }], 2))
      .mockResolvedValueOnce(createJsonResponse([{ id: 2 }], 2));
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(
      client.listOrders({
        ...validationRequest,
        since: new Date("2026-07-01T00:00:00.000Z"),
        perPage: 1,
      }),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }]);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expectCalledUrl(fetchFn, 0, {
      after: null,
      modifiedAfter: "2026-07-01T00:00:00.000Z",
      page: "1",
      path: "/wp-json/wc/v3/orders",
      perPage: "1",
    });
    expectCalledUrl(fetchFn, 1, {
      after: null,
      modifiedAfter: "2026-07-01T00:00:00.000Z",
      page: "2",
      path: "/wp-json/wc/v3/orders",
      perPage: "1",
    });
    expectOnlyGetRequests(fetchFn);
  });

  it("falls back to query-string credentials when a host rejects Basic Auth", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ code: "woocommerce_rest_cannot_view" }, 1, 401))
      .mockResolvedValueOnce(createJsonResponse({ environment: { version: "8.0.0" } }, 1));
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(client.validateConnection(validationRequest)).resolves.toMatchObject({
      status: "HEALTHY",
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      }),
    );
    expectCalledUrl(fetchFn, 1, {
      consumerKey: validationRequest.consumerKey,
      consumerSecret: validationRequest.consumerSecret,
      page: "1",
      path: "/wp-json/wc/v3/orders",
      perPage: "1",
    });
    expect(fetchFn.mock.calls[1]?.[1]).toEqual(
      expect.not.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
    expectOnlyGetRequests(fetchFn);
  });

  it("accepts a store URL that already points at the WordPress REST root", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(
      client.validateConnection({
        ...validationRequest,
        storeUrl: "https://ivonmelda.com/wp-json/",
      }),
    ).resolves.toMatchObject({
      status: "HEALTHY",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      new URL("https://ivonmelda.com/wp-json/wc/v3/orders?page=1&per_page=1"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("preserves WordPress subdirectory installs while removing duplicated REST path segments", async () => {
    const fetchFn = jest.fn().mockResolvedValue(createJsonResponse([{ id: 1 }], 1));
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(
      client.listOrders({
        ...validationRequest,
        storeUrl: "https://shop.example.com/store/wp-json/wc/v3/orders",
      }),
    ).resolves.toEqual([{ id: 1 }]);

    expectCalledUrl(fetchFn, 0, {
      page: "1",
      path: "/store/wp-json/wc/v3/orders",
      perPage: "100",
    });
  });

  it("reads products, customers, categories, refunds, and inventory with read-only endpoints", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(createJsonResponse([{ id: 10, sku: "SKU-1" }], 1))
      .mockResolvedValueOnce(createJsonResponse([{ id: 20, email: "customer@example.com" }], 1))
      .mockResolvedValueOnce(createJsonResponse([{ id: 30, name: "Shoes" }], 1))
      .mockResolvedValueOnce(createJsonResponse([{ id: 40, amount: "12.00" }], 1))
      .mockResolvedValueOnce(createJsonResponse([{ id: 50, stock_quantity: 9 }], 1));
    const client = new WooCommerceRestClient({ fetchFn });
    const since = new Date("2026-07-02T00:00:00.000Z");

    await expect(client.listProducts({ ...validationRequest, since })).resolves.toEqual([
      { id: 10, sku: "SKU-1" },
    ]);
    await expect(client.listCustomers({ ...validationRequest, since })).resolves.toEqual([
      { id: 20, email: "customer@example.com" },
    ]);
    await expect(client.listProductCategories({ ...validationRequest, since })).resolves.toEqual([
      { id: 30, name: "Shoes" },
    ]);
    await expect(client.listRefunds({ ...validationRequest, since })).resolves.toEqual([
      { id: 40, amount: "12.00" },
    ]);
    await expect(client.listInventoryProducts({ ...validationRequest, since })).resolves.toEqual([
      { id: 50, stock_quantity: 9 },
    ]);

    expectCalledUrl(fetchFn, 0, { after: since.toISOString(), path: "/wp-json/wc/v3/products" });
    expectCalledUrl(fetchFn, 1, { after: since.toISOString(), path: "/wp-json/wc/v3/customers" });
    expectCalledUrl(fetchFn, 2, { after: null, path: "/wp-json/wc/v3/products/categories" });
    expectCalledUrl(fetchFn, 3, { after: since.toISOString(), path: "/wp-json/wc/v3/refunds" });
    expectCalledUrl(fetchFn, 4, {
      after: since.toISOString(),
      fields: "id,name,sku,manage_stock,stock_quantity,stock_status,date_modified_gmt",
      path: "/wp-json/wc/v3/products",
    });
    expectOnlyGetRequests(fetchFn);
  });

  it("maps authentication failures safely", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(client.validateConnection(validationRequest)).rejects.toThrow(
      IntegrationAuthenticationError,
    );
  });

  it("maps network failures safely", async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error("network down"));
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(client.validateConnection(validationRequest)).rejects.toThrow(
      IntegrationConnectionError,
    );
  });

  it("maps rate limits safely", async () => {
    const fetchFn = jest.fn().mockResolvedValue(createJsonResponse({ message: "rate limited" }, 1, 429));
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(client.listOrders(validationRequest)).rejects.toThrow(IntegrationConnectionError);
  });

  it("rejects invalid store URLs before making HTTP calls", async () => {
    const fetchFn = jest.fn();
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(
      client.validateConnection({ ...validationRequest, storeUrl: "not a url" }),
    ).rejects.toThrow(IntegrationConnectionError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

function createJsonResponse(body: unknown, totalPages: number, status = 200): Response {
  return {
    headers: new Headers({ "x-wp-totalpages": String(totalPages) }),
    json: jest.fn().mockResolvedValue(body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

function expectOnlyGetRequests(fetchFn: jest.Mock): void {
  for (const call of fetchFn.mock.calls) {
    expect(call[1]).toEqual(expect.objectContaining({ method: "GET" }));
    expect(call[1]).not.toEqual(expect.objectContaining({ method: "POST" }));
    expect(call[1]).not.toEqual(expect.objectContaining({ method: "PUT" }));
    expect(call[1]).not.toEqual(expect.objectContaining({ method: "PATCH" }));
    expect(call[1]).not.toEqual(expect.objectContaining({ method: "DELETE" }));
  }
}

function expectCalledUrl(
  fetchFn: jest.Mock,
  callIndex: number,
  expectation: {
    readonly after?: string | null;
    readonly consumerKey?: string;
    readonly consumerSecret?: string;
    readonly fields?: string;
    readonly modifiedAfter?: string | null;
    readonly page?: string;
    readonly path: string;
    readonly perPage?: string;
  },
): void {
  const url = fetchFn.mock.calls[callIndex]?.[0] as URL;

  expect(url.pathname).toBe(expectation.path);
  if (expectation.after !== undefined) {
    expect(url.searchParams.get("after")).toBe(expectation.after);
  }
  if (expectation.modifiedAfter !== undefined) {
    expect(url.searchParams.get("modified_after")).toBe(expectation.modifiedAfter);
  }
  if (expectation.consumerKey !== undefined) {
    expect(url.searchParams.get("consumer_key")).toBe(expectation.consumerKey);
  }
  if (expectation.consumerSecret !== undefined) {
    expect(url.searchParams.get("consumer_secret")).toBe(expectation.consumerSecret);
  }
  if (expectation.fields !== undefined) {
    expect(url.searchParams.get("_fields")).toBe(expectation.fields);
  }
  if (expectation.page !== undefined) {
    expect(url.searchParams.get("page")).toBe(expectation.page);
  }
  if (expectation.perPage !== undefined) {
    expect(url.searchParams.get("per_page")).toBe(expectation.perPage);
  }
}
