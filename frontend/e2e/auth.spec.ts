import { expect, test } from "@playwright/test";

// Exercises the real login/session/CSRF/logout flow against the actual
// FastAPI + Postgres stack (docker compose) — nothing here is mocked.
// Requires an admin user to already be seeded (see README: "Seed a user"),
// since there is no public signup endpoint (see PLAN.md).
const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";

test("logs in with valid credentials and reaches the dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();
  await expect(page.getByTestId("current-user")).toContainText(ADMIN_EMAIL);
  await expect(page.getByTestId("health-ok")).toBeVisible();
});

test("shows an error for invalid credentials and stays on the login page", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("the-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByTestId("login-error")).toContainText("Invalid email or password.");
  await expect(page).toHaveURL(/\/login$/);
});

test("session survives a full page reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();
  await expect(page.getByTestId("current-user")).toContainText(ADMIN_EMAIL);
});

test("logs out and is redirected to login on the next protected visit", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeVisible();

  // Even navigating straight to "/" again should bounce back to login now.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeVisible();
});

test("a mutating request without the CSRF header is rejected even with a valid session", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  // Bypass the app's own CSRF-header wiring and hit the API directly — the
  // session cookie is attached automatically by the browser either way, so
  // this simulates a cross-site attacker who has no way to read the CSRF
  // cookie or set a custom header on a cross-origin request.
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    return response.status;
  });

  expect(status).toBe(403);

  // And the session is still valid afterward — the rejected request didn't
  // log the user out.
  await page.reload();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();
});
