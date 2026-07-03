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
  it("validates credentials with a read-only system status request", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(client.validateConnection(validationRequest)).resolves.toMatchObject({
      status: "HEALTHY",
      message: "WooCommerce credentials validated successfully.",
      metadata: { endpoint: "/wp-json/wc/v3/system_status", readOnly: true },
    });

    expect(fetchFn).toHaveBeenCalledWith(
      new URL("https://shop.example.com/wp-json/wc/v3/system_status"),
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

  it("rejects invalid store URLs before making HTTP calls", async () => {
    const fetchFn = jest.fn();
    const client = new WooCommerceRestClient({ fetchFn });

    await expect(
      client.validateConnection({ ...validationRequest, storeUrl: "not a url" }),
    ).rejects.toThrow(IntegrationConnectionError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
