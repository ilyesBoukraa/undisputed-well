import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../test/renderWithProviders";
import { RequirePermission } from "./RequirePermission";

function mockAuthenticatedWith(permissions: string[]) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "viewer", permissions }),
  });
}

function renderGuarded(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<RequirePermission permission="rig:edit" />}>
        <Route path="/rigs/new" element={<div>Rig create form</div>} />
      </Route>
    </Routes>,
    { route },
  );
}

describe("RequirePermission", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders the route when the user has the permission", async () => {
    mockAuthenticatedWith(["rig:edit"]);
    renderGuarded("/rigs/new");

    await waitFor(() => expect(screen.getByText("Rig create form")).toBeInTheDocument());
  });

  it("shows a forbidden notice instead of the route when lacking the permission", async () => {
    mockAuthenticatedWith(["rig:read"]);
    renderGuarded("/rigs/new");

    await waitFor(() => expect(screen.getByTestId("forbidden-notice")).toBeInTheDocument());
    expect(screen.queryByText("Rig create form")).not.toBeInTheDocument();
  });
});
