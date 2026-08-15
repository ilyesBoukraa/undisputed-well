import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { RigsListPage } from "./RigsListPage";

const RIG_ALPHA = {
  id: 1,
  name: "Rig Alpha",
  location: "North Field",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
};

function mockAuthenticatedWith(permissions: string[]) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions }),
    "/api/rigs": () => jsonResponse({ items: [RIG_ALPHA], total: 1 }),
  });
  return global.fetch as jest.Mock;
}

describe("RigsListPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while rigs are being fetched", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/rigs": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<RigsListPage />, { route: "/rigs" });

    await waitFor(() => expect(screen.getByTestId("rigs-loading")).toBeInTheDocument());
  });

  it("shows an empty state when there are no rigs", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/rigs": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<RigsListPage />, { route: "/rigs" });

    await waitFor(() => expect(screen.getByTestId("rigs-empty")).toBeInTheDocument());
  });

  it("shows an error state when the rigs request fails", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/rigs": () => jsonResponse({}, { status: 500 }),
    });

    renderWithProviders(<RigsListPage />, { route: "/rigs" });

    await waitFor(() => expect(screen.getByTestId("rigs-error")).toBeInTheDocument());
  });

  it("renders populated rig rows", async () => {
    mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });

    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());
    expect(screen.getByText("Rig Alpha")).toBeInTheDocument();
    expect(screen.getByText("North Field")).toBeInTheDocument();
  });

  it("shows the New Rig button and per-row Edit link for a user with rig:edit", async () => {
    mockAuthenticatedWith(["rig:read", "rig:edit"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });

    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "New Rig" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
  });

  it("hides the New Rig button and Edit links for a viewer", async () => {
    mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });

    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "New Rig" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("re-requests rigs with the search term when typing in the search box", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });
    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());

    await user.type(screen.getByTestId("rig-search").querySelector("input")!, "alpha");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("q=alpha"),
        expect.anything(),
      ),
    );
  });

  it("toggles sort order when clicking the Name column header", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });
    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());

    await user.click(screen.getByText("Name"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        expect.anything(),
      ),
    );
  });

  it("switches the active sort column when clicking a different header", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });
    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());

    await user.click(screen.getByText("Created"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("sort=created_at"),
        expect.anything(),
      ),
    );
  });

  it("clears the search filter when the search box is emptied", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs?q=alpha" });
    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());

    await user.clear(screen.getByTestId("rig-search").querySelector("input")!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.not.stringContaining("q="),
        expect.anything(),
      ),
    );
  });

  it("filters by status via the status dropdown", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["rig:read"]);

    renderWithProviders(<RigsListPage />, { route: "/rigs" });
    await waitFor(() => expect(screen.getByTestId("rig-row-1")).toBeInTheDocument());

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "maintenance" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("status=maintenance"),
        expect.anything(),
      ),
    );
  });
});
