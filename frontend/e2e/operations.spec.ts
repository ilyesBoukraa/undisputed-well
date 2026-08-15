import { expect, test } from "@playwright/test";

// Exercises the real Operations/Threshold/SSE flow against the actual
// FastAPI + Postgres stack — nothing here is mocked. This is also the
// authoritative test of the SSE wire behavior: Starlette's TestClient can't
// exercise a genuinely open-ended stream (see backend/tests/test_operations.py's
// TestAlertStream docstring), so a real browser EventSource against the real
// Uvicorn server, driven here, is what actually proves it works.
const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";

test("recording a breaching reading raises a live alert in the browser via SSE", async ({ page }) => {
  const wellName = `E2E Ops Well ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  // Create a well to operate on.
  await page.goto("/wells/new");
  await page.getByLabel("Name").fill(wellName);
  await page.getByRole("button", { name: "Create Well" }).click();
  await expect(page.getByRole("heading", { name: wellName })).toBeVisible();

  // Open the operations dashboard and select that well.
  await page.getByRole("link", { name: "Operations" }).click();
  await expect(page).toHaveURL(/\/operations$/);

  // The SSE connection should reach "live" on its own.
  await expect(page.getByTestId("alert-stream-status")).toHaveText("live");

  await page.getByRole("combobox", { name: "Well" }).click();
  await page.getByRole("option", { name: wellName }).click();

  // Configure a critical threshold for pressure on this well.
  await page.getByRole("button", { name: "Add Threshold" }).click();
  await page.getByLabel("Critical max").fill("100");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator('[data-testid^="threshold-row-"]').filter({ hasText: "pressure" })).toBeVisible();

  // Record a reading that breaches it.
  await page.getByLabel("Value").fill("150");
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByTestId("reading-result")).toContainText("breach");

  // The resulting alert should show up live via the SSE stream (it's the
  // same page instance that just created it — this proves the stream
  // delivers newly-created alerts without a page reload, not just that the
  // REST list included it after a refetch).
  const alertRow = page.locator('[data-testid^="alert-"]').filter({ hasText: "pressure: 150" });
  await expect(alertRow).toBeVisible();
  await expect(alertRow).toContainText("critical");

  // Dismiss it.
  await alertRow.getByRole("button", { name: "Dismiss" }).click();
  await expect(alertRow).toHaveCount(0);
});

test("a viewer can see thresholds but cannot record readings or configure them", async ({ page }) => {
  const wellName = `E2E Viewer Ops Well ${Date.now()}`;

  // Create a dedicated well as admin first, so this test doesn't depend on
  // another test having left one behind.
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.goto("/wells/new");
  await page.getByLabel("Name").fill(wellName);
  await page.getByRole("button", { name: "Create Well" }).click();
  await expect(page.getByRole("heading", { name: wellName })).toBeVisible();
  const wellId = page.url().split("/").pop();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeVisible();

  await page.getByLabel("Email").fill("viewer@undisputedwell.dev");
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.goto(`/operations?well_id=${wellId}`);
  await expect(page.getByRole("heading", { name: "Thresholds" })).toBeVisible();
  await expect(page.getByText("Record a Reading")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Threshold" })).toHaveCount(0);
});
