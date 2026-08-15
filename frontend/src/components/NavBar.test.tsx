import { screen, waitFor } from "@testing-library/react";
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
});
