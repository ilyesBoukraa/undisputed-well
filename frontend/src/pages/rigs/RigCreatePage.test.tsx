import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { RigCreatePage } from "./RigCreatePage";

function mockAuthenticated() {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["rig:edit"] }),
    "/api/rigs": () =>
      jsonResponse({
        id: 42,
        name: "Rig Alpha",
        location: "North Field",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
      }),
  });
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/rigs/new" element={<RigCreatePage />} />
      <Route path="/rigs/:rigId" element={<div>Rig Detail Page</div>} />
    </Routes>,
    { route: "/rigs/new" },
  );
}

describe("RigCreatePage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("creates a rig and navigates to its detail page", async () => {
    const user = userEvent.setup();
    mockAuthenticated();

    renderPage();
    await user.type(await screen.findByLabelText("Name"), "Rig Alpha");
    await user.type(screen.getByLabelText("Location"), "North Field");
    await user.click(screen.getByRole("button", { name: "Create Rig" }));

    await waitFor(() => expect(screen.getByText("Rig Detail Page")).toBeInTheDocument());
  });
});
