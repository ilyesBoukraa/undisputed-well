import { expect, test } from "@playwright/test";

// Exercises the real asphaltene-prediction flow against the actual
// FastAPI + Postgres stack — nothing here is mocked.
const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";

test("running a prediction renders a chart and appears in history", async ({ page }) => {
  const wellName = `E2E Prediction Well ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.goto("/wells/new");
  await page.getByLabel("Name").fill(wellName);
  await page.getByRole("button", { name: "Create Well" }).click();
  await expect(page.getByRole("heading", { name: wellName })).toBeVisible();

  await page.getByRole("link", { name: "Predictions" }).click();
  await expect(page).toHaveURL(/\/predictions$/);

  await page.getByRole("combobox", { name: "Well" }).click();
  await page.getByRole("option", { name: wellName }).click();

  await expect(page.getByTestId("prediction-chart-empty")).toBeVisible();
  await expect(page.getByTestId("prediction-history-empty")).toBeVisible();

  await page.getByLabel("Reservoir pressure (psia)").fill("4000");
  await page.getByLabel("Reservoir temperature (°F)").fill("180");
  await page.getByLabel("API gravity (°API)").fill("35");
  await page.getByLabel("Gas specific gravity").fill("0.8");
  await page.getByLabel("Solution GOR (scf/STB)").fill("600");
  await page.getByLabel("Resin/asphaltene ratio").fill("1.0");
  await page.getByRole("button", { name: "Run Prediction" }).click();

  await expect(page.getByTestId("prediction-chart")).toBeVisible();
  await expect(page.getByTestId("prediction-risk-chip")).toContainText("unstable");
  await expect(page.locator('[data-testid^="prediction-history-row-"]')).toHaveCount(1);

  // Running a second, clearly-stable prediction and switching between them
  // in history should update the chart each time.
  await page.getByLabel("Resin/asphaltene ratio").fill("10");
  await page.getByRole("button", { name: "Run Prediction" }).click();
  await expect(page.getByTestId("prediction-risk-chip")).toContainText("stable");
  await expect(page.locator('[data-testid^="prediction-history-row-"]')).toHaveCount(2);

  const historyRows = page.locator('[data-testid^="prediction-history-row-"]');
  await historyRows.last().click();
  await expect(page.getByTestId("prediction-risk-chip")).toContainText("unstable");
});

test("a viewer can view predictions but cannot run one", async ({ page }) => {
  const wellName = `E2E Viewer Prediction Well ${Date.now()}`;

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

  await page.goto(`/predictions?well_id=${wellId}`);
  await expect(page.getByTestId("prediction-history-empty")).toBeVisible();
  await expect(page.getByText("Asphaltene Stability Prediction")).toHaveCount(0);
});
