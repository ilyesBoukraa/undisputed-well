import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, renderWithProviders } from "../../test/renderWithProviders";
import { WellDetailPage } from "./WellDetailPage";

const WELL = {
  id: 9,
  name: "Well-1",
  status: "producing",
  depth_m: 1500,
  spud_date: "2025-06-01",
  rig_id: 3,
  rig: { id: 3, name: "Rig Alpha" },
  created_at: "2026-01-01T00:00:00Z",
};

function mockFetchByMethod(handlers: Record<string, () => Response>) {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const match = Object.entries(handlers).find(([pattern]) => {
      const [patternMethod, patternPath] = pattern.split(" ");
      return patternMethod === method && url.includes(patternPath);
    });
    if (!match) {
      throw new Error(`No mock fetch handler registered for ${method} ${url}`);
    }
    return Promise.resolve(match[1]());
  }) as jest.Mock;
}

function renderPage(permissions: string[]) {
  mockFetchByMethod({
    "GET /api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions }),
    "GET /api/wells/9": () => jsonResponse(WELL),
    "DELETE /api/wells/9": () => jsonResponse(null, { status: 204 }),
  });

  return renderWithProviders(
    <Routes>
      <Route path="/wells/:wellId" element={<WellDetailPage />} />
      <Route path="/wells" element={<div>Wells List Page</div>} />
    </Routes>,
    { route: "/wells/9" },
  );
}

describe("WellDetailPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders well details including the linked rig", async () => {
    renderPage(["well:read"]);

    expect(await screen.findByText("Well-1")).toBeInTheDocument();
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("producing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rig Alpha" })).toHaveAttribute("href", "/rigs/3");
  });

  it("shows Edit and Delete only for a user with the right permissions", async () => {
    renderPage(["well:read", "well:edit", "well:delete"]);

    await screen.findByText("Well-1");
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides Edit and Delete for a viewer", async () => {
    renderPage(["well:read"]);

    await screen.findByText("Well-1");
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("deletes the well after confirmation and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderPage(["well:read", "well:delete"]);

    await screen.findByText("Well-1");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByTestId("confirm-delete-well"));

    await waitFor(() => expect(screen.getByText("Wells List Page")).toBeInTheDocument());
  });

  it("cancels the delete confirmation without deleting", async () => {
    const user = userEvent.setup();
    renderPage(["well:read", "well:delete"]);

    await screen.findByText("Well-1");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("confirm-delete-well")).not.toBeInTheDocument();
    expect(screen.getByText("Well-1")).toBeInTheDocument();
  });

  it("shows an error state when the well fails to load", async () => {
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:read"] }),
      "GET /api/wells/9": () => jsonResponse({}, { status: 404 }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/wells/:wellId" element={<WellDetailPage />} />
      </Routes>,
      { route: "/wells/9" },
    );

    await waitFor(() => expect(screen.getByTestId("well-detail-error")).toBeInTheDocument());
  });
});
