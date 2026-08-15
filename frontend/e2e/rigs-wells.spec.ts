import { expect, test } from "@playwright/test";

// Exercises the real Well/Rig CRUD flow against the actual FastAPI + Postgres
// stack (docker compose) — nothing here is mocked. Requires both an admin and
// a viewer account to already be seeded (see README: "Seed a user").
const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";
const VIEWER_EMAIL = "viewer@undisputedwell.dev";
const VIEWER_PASSWORD = "correct horse battery staple";

async function loginAs(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();
}

test("admin can create, edit, and delete a rig through the UI", async ({ page }) => {
  const rigName = `E2E Rig ${Date.now()}`;
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  await page.getByRole("link", { name: "Rigs" }).click();
  await expect(page).toHaveURL(/\/rigs$/);

  await page.getByRole("link", { name: "New Rig" }).click();
  await page.getByLabel("Name").fill(rigName);
  await page.getByLabel("Location").fill("North Field");
  await page.getByRole("button", { name: "Create Rig" }).click();

  await expect(page.getByRole("heading", { name: rigName })).toBeVisible();

  // Edit
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Location").fill("South Field");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Location: South Field")).toBeVisible();

  // Delete
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByTestId("confirm-delete-rig").click();
  await expect(page).toHaveURL(/\/rigs$/);
  await expect(page.getByText(rigName)).toHaveCount(0);
});

test("admin can create a well, assign it to a rig, and delete it", async ({ page }) => {
  const rigName = `E2E Rig For Well ${Date.now()}`;
  const wellName = `E2E Well ${Date.now()}`;
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Create a rig to assign the well to.
  await page.goto("/rigs/new");
  await page.getByLabel("Name").fill(rigName);
  await page.getByLabel("Location").fill("North Field");
  await page.getByRole("button", { name: "Create Rig" }).click();
  await expect(page.getByRole("heading", { name: rigName })).toBeVisible();

  // Create a well assigned to that rig.
  await page.goto("/wells/new");
  await page.getByLabel("Name").fill(wellName);
  await page.getByRole("combobox", { name: "Rig" }).click();
  await page.getByRole("option", { name: rigName }).click();
  await page.getByRole("button", { name: "Create Well" }).click();

  await expect(page.getByRole("heading", { name: wellName })).toBeVisible();
  await expect(page.getByRole("link", { name: rigName })).toBeVisible();

  // Delete the well.
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByTestId("confirm-delete-well").click();
  await expect(page).toHaveURL(/\/wells$/);
  await expect(page.getByText(wellName)).toHaveCount(0);
});

test("a viewer cannot see rig management controls and is blocked from a direct URL", async ({
  page,
}) => {
  await loginAs(page, VIEWER_EMAIL, VIEWER_PASSWORD);

  await page.getByRole("link", { name: "Rigs" }).click();
  await expect(page).toHaveURL(/\/rigs$/);
  await expect(page.getByRole("link", { name: "New Rig" })).toHaveCount(0);

  // Direct URL access to a permission-gated route must also be blocked, not
  // just the UI control that links to it.
  await page.goto("/rigs/new");
  await expect(page.getByTestId("forbidden-notice")).toBeVisible();
});

test("a viewer's mutating request is rejected by the API even if attempted directly", async ({
  page,
}) => {
  await loginAs(page, VIEWER_EMAIL, VIEWER_PASSWORD);

  const status = await page.evaluate(async () => {
    const csrfMatch = document.cookie.match(/uw_csrf=([^;]+)/);
    const response = await fetch("/api/rigs", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfMatch ? csrfMatch[1] : "",
      },
      body: JSON.stringify({ name: "Should Not Exist", location: "Nowhere" }),
    });
    return response.status;
  });

  expect(status).toBe(403);
});
