import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "./client";

describe("apiGet", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) });

    await expect(apiGet("/thing")).resolves.toEqual({ a: 1 });
  });

  it("throws ApiError with the response status on failure", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });

    await expect(apiGet("/thing")).rejects.toMatchObject({ status: 503, name: "ApiError" });
  });
});

describe("apiPost", () => {
  afterEach(() => {
    jest.resetAllMocks();
    document.cookie = "uw_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("sends the CSRF header read from the cookie", async () => {
    document.cookie = "uw_csrf=my-token";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    await apiPost("/thing", { a: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/thing",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-CSRF-Token": "my-token" }),
      }),
    );
  });

  it("sends an empty CSRF header when no cookie is set", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    await apiPost("/thing");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/thing",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-CSRF-Token": "" }),
      }),
    );
  });

  it("throws ApiError on a non-2xx response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" });

    await expect(apiPost("/thing")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns undefined for a 204 No Content response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });

    await expect(apiPost("/thing")).resolves.toBeUndefined();
  });
});

describe("apiPatch", () => {
  afterEach(() => {
    jest.resetAllMocks();
    document.cookie = "uw_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("sends a PATCH with the CSRF header and body", async () => {
    document.cookie = "uw_csrf=my-token";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

    await apiPatch("/thing/1", { name: "new" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/thing/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "new" }),
        headers: expect.objectContaining({ "X-CSRF-Token": "my-token" }),
      }),
    );
  });

  it("throws ApiError on a non-2xx response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 409, statusText: "Conflict" });

    await expect(apiPatch("/thing/1", {})).rejects.toMatchObject({ status: 409 });
  });
});

describe("apiDelete", () => {
  afterEach(() => {
    jest.resetAllMocks();
    document.cookie = "uw_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("sends a DELETE with the CSRF header and resolves undefined on 204", async () => {
    document.cookie = "uw_csrf=my-token";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });

    await expect(apiDelete("/thing/1")).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/thing/1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "X-CSRF-Token": "my-token" }),
      }),
    );
  });

  it("throws ApiError on a non-2xx response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" });

    await expect(apiDelete("/thing/1")).rejects.toBeInstanceOf(ApiError);
  });
});
