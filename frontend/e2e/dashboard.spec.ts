import { expect, test } from "@playwright/test";

// UI2: the dashboard is now a real fleet-wide summary built on the existing
// rigs/wells/alerts/predictions list endpoints. These tests exercise it
// against the real stack — a shared dev DB other specs also write to, so
// assertions look for specific, uniquely-named entities rather than exact
// totals (the same convention rigs-wells.spec.ts and operations.spec.ts use).
const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";

test("the fleet overview reflects a newly created rig, well, and breaching alert", async ({ page }) => {
  const rigName = `E2E Dashboard Rig ${Date.now()}`;
  const wellName = `E2E Dashboard Well ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  // The overview panels render before any of this test's own data exists.
  await expect(page.getByRole("heading", { name: "Fleet at a glance" })).toBeVisible();
  await expect(page.getByTestId("stat-tile-wells")).toBeVisible();
  await expect(page.getByTestId("stat-tile-rigs")).toBeVisible();
  await expect(page.getByTestId("stat-tile-active-alerts")).toBeVisible();
  await expect(page.getByTestId("stat-tile-predictions-at-risk")).toBeVisible();

  await page.goto("/rigs/new");
  await page.getByLabel("Name").fill(rigName);
  await page.getByLabel("Location").fill("Permian Basin");
  await page.getByRole("button", { name: "Create Rig" }).click();
  await expect(page.getByRole("heading", { name: rigName })).toBeVisible();

  await page.goto("/wells/new");
  await page.getByLabel("Name").fill(wellName);
  await page.getByRole("button", { name: "Create Well" }).click();
  await expect(page.getByRole("heading", { name: wellName })).toBeVisible();
  const wellId = page.url().split("/").pop();

  // Configure a critical threshold and record a breaching reading, same as
  // operations.spec.ts, so there's a real alert for the dashboard to show.
  await page.goto(`/operations?well_id=${wellId}`);
  await page.getByRole("button", { name: "Add Threshold" }).click();
  await page.getByLabel("Critical max").fill("100");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator('[data-testid^="threshold-row-"]').filter({ hasText: "pressure" })).toBeVisible();
  await page.getByLabel("Value").fill("150");
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByTestId("reading-result")).toContainText("breach");

  // Back on the dashboard: the new rig shows up in Fleet Status, and the
  // new alert shows up in Recent Alerts.
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-testid^="fleet-rig-"]').filter({ hasText: rigName })).toBeVisible();
  await expect(
    page.locator('[data-testid^="recent-alert-"]').filter({ hasText: wellName }),
  ).toBeVisible();
});

test("a viewer sees the same fleet overview without any admin-only controls", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("viewer@undisputedwell.dev");
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Fleet at a glance" })).toBeVisible();
  await expect(page.getByTestId("stat-tile-wells")).toBeVisible();
  await expect(page.getByTestId("stat-tile-rigs")).toBeVisible();
  await expect(page.getByTestId("admin-panel-link")).toHaveCount(0);
});
