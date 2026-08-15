import { readCsrfToken } from "./csrf";

describe("readCsrfToken", () => {
  afterEach(() => {
    document.cookie = "uw_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("returns null when the csrf cookie is not set", () => {
    expect(readCsrfToken()).toBeNull();
  });

  it("reads the csrf cookie value when present among other cookies", () => {
    document.cookie = "other=1";
    document.cookie = "uw_csrf=abc123";

    expect(readCsrfToken()).toBe("abc123");
  });

  it("decodes URL-encoded cookie values", () => {
    document.cookie = `uw_csrf=${encodeURIComponent("token/with+special=chars")}`;

    expect(readCsrfToken()).toBe("token/with+special=chars");
  });
});
