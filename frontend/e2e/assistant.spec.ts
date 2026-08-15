import { expect, test } from "@playwright/test";

// Exercises the real AI assistant flow — retrieval + extractive synthesis
// + SSE-style streamed response — against the actual FastAPI stack. See
// backend/app/rag/ for what "AI" means here: no external LLM, a real
// TF-IDF retrieval + extractive-QA pipeline grounded in the platform's own
// documentation.
const ADMIN_EMAIL = "admin@undisputedwell.dev";
const ADMIN_PASSWORD = "correct horse battery staple";

test("asking a question streams a grounded, sourced answer", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(page.getByTestId("assistant-empty")).toBeVisible();

  await page.getByLabel("Ask a question").fill("who can delete a rig");
  await page.getByRole("button", { name: "Send" }).click();

  // The Send button should show a transient "thinking" state while the
  // answer streams in.
  await expect(page.getByRole("button", { name: "Thinking…" })).toBeVisible();

  await expect(page.getByText("who can delete a rig")).toBeVisible();
  await expect(page.getByText(/Only admins can delete a rig/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Wells & Rigs Management")).toBeVisible();

  // Streaming finished — back to the normal Send state.
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
});

test("an unanswerable question gets an honest no-match response, and a viewer can use the assistant", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("viewer@undisputedwell.dev");
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "UndisputedWell", exact: true })).toBeVisible();

  await page.goto("/assistant");
  await page.getByLabel("Ask a question").fill("xyzzy plugh quokka wombat");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText(/don't have information/)).toBeVisible({ timeout: 10000 });
});
