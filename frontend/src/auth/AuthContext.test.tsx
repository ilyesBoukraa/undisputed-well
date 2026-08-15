import { render } from "@testing-library/react";
import { useAuth } from "./AuthContext";

function ConsumerOutsideProvider() {
  useAuth();
  return null;
}

describe("useAuth", () => {
  it("throws when used outside an AuthProvider", () => {
    // Suppress the expected React error-boundary console noise for this case.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ConsumerOutsideProvider />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );

    consoleError.mockRestore();
  });
});
