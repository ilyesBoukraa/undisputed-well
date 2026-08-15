import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, renderWithProviders } from "../../test/renderWithProviders";
import { RigEditPage } from "./RigEditPage";

const RIG = {
  id: 7,
  name: "Rig Alpha",
  location: "North Field",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
};

/** Method-aware fetch mock — RigEditPage GETs then PATCHes the same URL. */
function mockFetchByMethod(handlers: Record<string, (init?: RequestInit) => Response> ) {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const key = `${method} ${url.split("?")[0]}`;
    const match = Object.entries(handlers).find(([pattern]) => {
      const [patternMethod, patternPath] = pattern.split(" ");
      return patternMethod === method && url.includes(patternPath);
    });
    if (!match) {
      throw new Error(`No mock fetch handler registered for ${key}`);
    }
    return Promise.resolve(match[1](init));
  }) as jest.Mock;
}

function renderPage(route = "/rigs/7/edit") {
  return renderWithProviders(
    <Routes>
      <Route path="/rigs/:rigId/edit" element={<RigEditPage />} />
      <Route path="/rigs/:rigId" element={<div>Rig Detail Page</div>} />
    </Routes>,
    { route },
  );
}

describe("RigEditPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while the rig is being fetched", async () => {
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["rig:edit"] }),
      "GET /api/rigs/7": () => new Promise(() => {}) as unknown as Response,
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId("rig-edit-loading")).toBeInTheDocument());
  });

  it("shows an error state when the rig fails to load", async () => {
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["rig:edit"] }),
      "GET /api/rigs/7": () => jsonResponse({}, { status: 404 }),
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId("rig-edit-error")).toBeInTheDocument());
  });

  it("pre-fills the form and saves changes, then navigates to the detail page", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["rig:edit"] }),
      "GET /api/rigs/7": () => jsonResponse(RIG),
      "PATCH /api/rigs/7": () => jsonResponse({ ...RIG, status: "maintenance" }),
    });

    renderPage();

    expect(await screen.findByDisplayValue("Rig Alpha")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(screen.getByText("Rig Detail Page")).toBeInTheDocument());
  });
});
