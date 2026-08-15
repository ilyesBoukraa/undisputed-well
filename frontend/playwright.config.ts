import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests exercise the app through the real Nginx+FastAPI stack
 * (docker compose), not the Vite dev server — see PLAN.md testing stack.
 * Set E2E_BASE_URL to override (defaults to the docker-compose "web" port).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The HTML report is only generated in CI (see .github/workflows/ci.yml,
  // which uploads frontend/playwright-report/ on failure) — locally, "list"
  // alone is faster and doesn't try to open a browser tab.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
