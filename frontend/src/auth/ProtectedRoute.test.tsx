import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../test/renderWithProviders";
import { ProtectedRoute } from "./ProtectedRoute";

function renderProtectedRoutes() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>Protected Content</div>} />
      </Route>
    </Routes>,
    { route: "/" },
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while the auth check is in flight", () => {
    mockFetchByPath({ "/api/auth/me": () => new Promise(() => {}) as unknown as Response });

    renderProtectedRoutes();

    expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
  });

  it("redirects to /login when the visitor is not authenticated", async () => {
    mockFetchByPath({
      "/api/auth/me": () => jsonResponse({ detail: "Not authenticated" }, { status: 401 }),
    });

    renderProtectedRoutes();

    await waitFor(() => expect(screen.getByText("Login Page")).toBeInTheDocument());
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders the protected content when the visitor is authenticated", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "viewer", permissions: [] }),
    });

    renderProtectedRoutes();

    await waitFor(() => expect(screen.getByText("Protected Content")).toBeInTheDocument());
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});
