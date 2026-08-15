import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();
}

test("follows the OS color scheme until the user overrides it, then persists across reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await login(page);

  // No explicit choice yet — should follow the (emulated) OS dark preference.
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

  // Override to light explicitly.
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");

  // The explicit choice survives a reload, even though the OS still says dark.
  await page.reload();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();

  // And switching the OS preference no longer has any effect post-override.
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
});

// UI1: previously only the authenticated NavBar had a toggle — an
// unauthenticated visitor had no way to switch modes at all.
test("the login page itself has a working theme toggle, before any authentication", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

  // The login form itself is unaffected — still usable after toggling.
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
