import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../test/renderWithProviders";
import { Login } from "./Login";

function renderLoginWithRoutes() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<div>Dashboard Page</div>} />
    </Routes>,
    { route: "/login" },
  );
}

describe("Login", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders the login form", () => {
    renderLoginWithRoutes();

    expect(screen.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderLoginWithRoutes();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows a validation error for a malformed email", async () => {
    const user = userEvent.setup();
    renderLoginWithRoutes();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "some-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("shows a loading state while the login request is in flight", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/login": () => new Promise(() => {}) as unknown as Response,
    });

    renderLoginWithRoutes();
    await user.type(screen.getByLabelText("Email"), "engineer@undisputedwell.dev");
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Signing in…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  it("shows an error state when the credentials are rejected", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/login": () => jsonResponse({ detail: "Invalid email or password" }, { status: 401 }),
    });

    renderLoginWithRoutes();
    await user.type(screen.getByLabelText("Email"), "engineer@undisputedwell.dev");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByTestId("login-error")).toHaveTextContent("Invalid email or password.");
  });

  it("shows a generic error state for a non-401 failure", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/login": () => jsonResponse({ detail: "Server error" }, { status: 500 }),
    });

    renderLoginWithRoutes();
    await user.type(screen.getByLabelText("Email"), "engineer@undisputedwell.dev");
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByTestId("login-error")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("navigates to the dashboard on successful login", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/login": () =>
        jsonResponse({
          id: 1,
          email: "engineer@undisputedwell.dev",
          role: "engineer",
          permissions: ["well:read"],
        }),
    });

    renderLoginWithRoutes();
    await user.type(screen.getByLabelText("Email"), "engineer@undisputedwell.dev");
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText("Dashboard Page")).toBeInTheDocument());
  });
});
