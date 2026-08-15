import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../test/renderWithProviders";
import { NavBar } from "./NavBar";

function mockAuthenticated() {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({
        id: 1,
        email: "engineer@undisputedwell.dev",
        role: "engineer",
        permissions: ["well:read"],
      }),
  });
}

describe("NavBar", () => {
  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  it("renders links to dashboard, rigs and wells", async () => {
    mockAuthenticated();
    renderWithProviders(<NavBar />);

    await waitFor(() => expect(screen.getByTestId("current-user")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Rigs" })).toHaveAttribute("href", "/rigs");
    expect(screen.getByRole("link", { name: "Wells" })).toHaveAttribute("href", "/wells");
    expect(screen.getByRole("link", { name: "Operations" })).toHaveAttribute("href", "/operations");
    expect(screen.getByRole("link", { name: "Predictions" })).toHaveAttribute("href", "/predictions");
    expect(screen.getByRole("link", { name: "Assistant" })).toHaveAttribute("href", "/assistant");
  });

  it("shows a dark-mode toggle that switches to light mode when clicked", async () => {
    const user = userEvent.setup();
    mockAuthenticated();
    renderWithProviders(<NavBar />);

    await waitFor(() => expect(screen.getByTestId("current-user")).toBeInTheDocument());

    const toggle = screen.getByRole("button", { name: "Switch to dark mode" });
    await user.click(toggle);

    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
    expect(window.localStorage.getItem("undisputedwell-theme-mode")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(window.localStorage.getItem("undisputedwell-theme-mode")).toBe("light");
  });

  it("marks the current route's link as the active page and no other", async () => {
    mockAuthenticated();
    renderWithProviders(<NavBar />, { route: "/wells" });

    await waitFor(() => expect(screen.getByTestId("current-user")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Wells" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Rigs" })).not.toHaveAttribute("aria-current");
  });
});
