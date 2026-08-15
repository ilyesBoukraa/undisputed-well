import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, renderWithProviders } from "../../test/renderWithProviders";
import { RigDetailPage } from "./RigDetailPage";

const RIG = {
  id: 7,
  name: "Rig Alpha",
  location: "North Field",
  status: "active",
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
    "GET /api/rigs/7": () => jsonResponse(RIG),
    "DELETE /api/rigs/7": () => jsonResponse(null, { status: 204 }),
  });

  return renderWithProviders(
    <Routes>
      <Route path="/rigs/:rigId" element={<RigDetailPage />} />
      <Route path="/rigs" element={<div>Rigs List Page</div>} />
    </Routes>,
    { route: "/rigs/7" },
  );
}

describe("RigDetailPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders rig details once loaded", async () => {
    renderPage(["rig:read"]);

    expect(await screen.findByText("Rig Alpha")).toBeInTheDocument();
    expect(screen.getByText("Location: North Field")).toBeInTheDocument();
  });

  it("shows Edit and Delete only for a user with the right permissions", async () => {
    renderPage(["rig:read", "rig:edit", "rig:delete"]);

    await screen.findByText("Rig Alpha");
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides Edit and Delete for a viewer", async () => {
    renderPage(["rig:read"]);

    await screen.findByText("Rig Alpha");
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("deletes the rig after confirmation and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderPage(["rig:read", "rig:delete"]);

    await screen.findByText("Rig Alpha");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByTestId("confirm-delete-rig"));

    await waitFor(() => expect(screen.getByText("Rigs List Page")).toBeInTheDocument());
  });

  it("cancels the delete confirmation without deleting", async () => {
    const user = userEvent.setup();
    renderPage(["rig:read", "rig:delete"]);

    await screen.findByText("Rig Alpha");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("confirm-delete-rig")).not.toBeInTheDocument();
    expect(screen.getByText("Rig Alpha")).toBeInTheDocument();
  });

  it("shows an error state when the rig fails to load", async () => {
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["rig:read"] }),
      "GET /api/rigs/7": () => jsonResponse({}, { status: 404 }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/rigs/:rigId" element={<RigDetailPage />} />
      </Routes>,
      { route: "/rigs/7" },
    );

    await waitFor(() => expect(screen.getByTestId("rig-detail-error")).toBeInTheDocument());
  });

  it("shows a delete-error alert when the delete request fails", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      "GET /api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["rig:read", "rig:delete"] }),
      "GET /api/rigs/7": () => jsonResponse(RIG),
      "DELETE /api/rigs/7": () => jsonResponse({ detail: "nope" }, { status: 403 }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/rigs/:rigId" element={<RigDetailPage />} />
      </Routes>,
      { route: "/rigs/7" },
    );

    await screen.findByText("Rig Alpha");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByTestId("confirm-delete-rig"));

    await waitFor(() => expect(screen.getByTestId("rig-delete-error")).toBeInTheDocument());
  });
});
