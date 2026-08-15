import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { WellsListPage } from "./WellsListPage";

const WELL_1 = {
  id: 1,
  name: "Well-1",
  status: "producing",
  depth_m: 1200,
  spud_date: "2025-01-01",
  rig_id: 3,
  rig: { id: 3, name: "Rig Alpha" },
  created_at: "2026-01-01T00:00:00Z",
};

function mockAuthenticatedWith(permissions: string[]) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions }),
    "/api/wells": () => jsonResponse({ items: [WELL_1], total: 1 }),
  });
  return global.fetch as jest.Mock;
}

describe("WellsListPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while wells are being fetched", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/wells": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("wells-loading")).toBeInTheDocument());
  });

  it("shows an empty state when there are no wells", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/wells": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("wells-empty")).toBeInTheDocument());
  });

  it("shows an error state when the wells request fails", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/wells": () => jsonResponse({}, { status: 500 }),
    });

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("wells-error")).toBeInTheDocument());
  });

  it("renders populated well rows including the rig name", async () => {
    mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());
    expect(screen.getByText("Well-1")).toBeInTheDocument();
    expect(screen.getByText("Rig Alpha")).toBeInTheDocument();
  });

  it("shows the New Well button and Edit link for a user with well:edit", async () => {
    mockAuthenticatedWith(["well:read", "well:edit"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "New Well" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
  });

  it("hides the New Well button and Edit link for a viewer", async () => {
    mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "New Well" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("re-requests wells with the status filter when selected", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });
    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "producing" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("status=producing"),
        expect.anything(),
      ),
    );
  });

  it("re-requests wells with the search term when typing in the search box", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });
    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());

    await user.type(screen.getByTestId("well-search").querySelector("input")!, "well-1");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("q=well-1"),
        expect.anything(),
      ),
    );
  });

  it("clears the search filter when the search box is emptied", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells?q=well-1" });
    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());

    await user.clear(screen.getByTestId("well-search").querySelector("input")!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.not.stringContaining("q="),
        expect.anything(),
      ),
    );
  });

  it("toggles sort order when clicking the Name column header twice", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });
    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());

    await user.click(screen.getByText("Name"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        expect.anything(),
      ),
    );
  });

  it("switches the active sort column when clicking Status", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAuthenticatedWith(["well:read"]);

    renderWithProviders(<WellsListPage />, { route: "/wells" });
    await waitFor(() => expect(screen.getByTestId("well-row-1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Status" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("sort=status"),
        expect.anything(),
      ),
    );
  });

  it("shows a dash for depth and rig when a well has neither", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/wells": () =>
        jsonResponse({
          items: [
            {
              id: 2,
              name: "Well-2",
              status: "drilling",
              depth_m: null,
              spud_date: null,
              rig_id: null,
              rig: null,
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
          total: 1,
        }),
    });

    renderWithProviders(<WellsListPage />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("well-row-2")).toBeInTheDocument());
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
