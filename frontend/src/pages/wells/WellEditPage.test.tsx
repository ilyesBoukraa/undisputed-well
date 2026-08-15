import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, renderWithProviders } from "../../test/renderWithProviders";
import { WellEditPage } from "./WellEditPage";

const WELL = {
  id: 9,
  name: "Well-1",
  status: "drilling",
  depth_m: null,
  spud_date: null,
  rig_id: null,
  rig: null,
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

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/wells/:wellId/edit" element={<WellEditPage />} />
      <Route path="/wells/:wellId" element={<div>Well Detail Page</div>} />
    </Routes>,
    { route: "/wells/9/edit" },
  );
}

describe("WellEditPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while the well is being fetched", async () => {
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
      "GET /api/rigs": () => jsonResponse({ items: [], total: 0 }),
      "GET /api/wells/9": () => new Promise(() => {}) as unknown as Response,
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId("well-edit-loading")).toBeInTheDocument());
  });

  it("shows an error state when the well fails to load", async () => {
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
      "GET /api/rigs": () => jsonResponse({ items: [], total: 0 }),
      "GET /api/wells/9": () => jsonResponse({}, { status: 404 }),
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId("well-edit-error")).toBeInTheDocument());
  });

  it("pre-fills the form and saves changes, then navigates to the detail page", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
      "GET /api/rigs": () => jsonResponse({ items: [], total: 0 }),
      "GET /api/wells/9": () => jsonResponse(WELL),
      "PATCH /api/wells/9": () => jsonResponse({ ...WELL, status: "producing" }),
    });

    renderPage();

    expect(await screen.findByDisplayValue("Well-1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(screen.getByText("Well Detail Page")).toBeInTheDocument());
  });
});
