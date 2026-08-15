import { fetchCurrentUser, login, logout } from "./auth";

describe("fetchCurrentUser", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns the user on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, email: "e@undisputedwell.dev", role: "viewer", permissions: [] }),
    });

    await expect(fetchCurrentUser()).resolves.toMatchObject({ email: "e@undisputedwell.dev" });
  });

  it("resolves to null on a 401 (not an error — just not logged in)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" });

    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it("rethrows on other failures", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });

    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 500 });
  });
});

describe("login", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("posts credentials and returns the user", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, email: "e@undisputedwell.dev", role: "viewer", permissions: [] }),
    });

    const user = await login("e@undisputedwell.dev", "pw");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(user.email).toBe("e@undisputedwell.dev");
  });
});

describe("logout", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("posts to the logout endpoint", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });

    await logout();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
