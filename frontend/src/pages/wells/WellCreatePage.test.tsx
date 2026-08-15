import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { WellCreatePage } from "./WellCreatePage";

function mockAuthenticated() {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
    "/api/rigs": () => jsonResponse({ items: [], total: 0 }),
    "/api/wells": () =>
      jsonResponse({
        id: 9,
        name: "Well-1",
        status: "drilling",
        depth_m: null,
        spud_date: null,
        rig_id: null,
        rig: null,
        created_at: "2026-01-01T00:00:00Z",
      }),
  });
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/wells/new" element={<WellCreatePage />} />
      <Route path="/wells/:wellId" element={<div>Well Detail Page</div>} />
    </Routes>,
    { route: "/wells/new" },
  );
}

describe("WellCreatePage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("creates a well and navigates to its detail page", async () => {
    const user = userEvent.setup();
    mockAuthenticated();

    renderPage();
    await user.type(await screen.findByLabelText("Name"), "Well-1");
    await user.click(screen.getByRole("button", { name: "Create Well" }));

    await waitFor(() => expect(screen.getByText("Well Detail Page")).toBeInTheDocument());
  });
});
