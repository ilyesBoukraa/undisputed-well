import { expect, test } from "@playwright/test";

test("an unauthenticated visitor hitting the app is redirected to login, which reaches the API through the reverse proxy", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeVisible();
});
