import { screen, waitFor } from "@testing-library/react";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../test/renderWithProviders";
import { usePermission } from "./usePermission";

function PermissionProbe({ permission }: { permission: string }) {
  const allowed = usePermission(permission);
  return <div data-testid="probe-result">{allowed ? "allowed" : "denied"}</div>;
}

describe("usePermission", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns true when the current user has the permission", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
    });

    renderWithProviders(<PermissionProbe permission="well:edit" />);

    await waitFor(() => expect(screen.getByTestId("probe-result")).toHaveTextContent("allowed"));
  });

  it("returns false when the current user lacks the permission", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "viewer", permissions: ["well:read"] }),
    });

    renderWithProviders(<PermissionProbe permission="well:edit" />);

    await waitFor(() => expect(screen.getByTestId("probe-result")).toHaveTextContent("denied"));
  });

  it("returns false while unauthenticated", async () => {
    mockFetchByPath({
      "/api/auth/me": () => jsonResponse({ detail: "Not authenticated" }, { status: 401 }),
    });

    renderWithProviders(<PermissionProbe permission="well:edit" />);

    await waitFor(() => expect(screen.getByTestId("probe-result")).toHaveTextContent("denied"));
  });
});
