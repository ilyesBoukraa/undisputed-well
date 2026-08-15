import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeModeProvider, useThemeMode } from "./ThemeModeProvider";

const STORAGE_KEY = "undisputedwell-theme-mode";

function mockMatchMedia(matches: boolean) {
  const listeners: ((event: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    },
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    dispatchEvent: () => false,
  } as MediaQueryList;

  window.matchMedia = jest.fn().mockReturnValue(mql);

  return {
    fireChange: (nextMatches: boolean) => {
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent));
    },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>;
}

describe("ThemeModeProvider", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.localStorage.clear();
    window.matchMedia = originalMatchMedia;
  });

  it("defaults to light when there is no stored preference and no system dark preference", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    expect(result.current.mode).toBe("light");
  });

  it("defaults to dark when the system prefers dark and there is no stored override", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    expect(result.current.mode).toBe("dark");
  });

  it("prefers a stored explicit choice over the system preference", () => {
    mockMatchMedia(true);
    window.localStorage.setItem(STORAGE_KEY, "light");
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    expect(result.current.mode).toBe("light");
  });

  it("ignores a garbage stored value and falls back to system preference", () => {
    mockMatchMedia(true);
    window.localStorage.setItem(STORAGE_KEY, "not-a-real-mode");
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    expect(result.current.mode).toBe("dark");
  });

  it("toggleMode flips the mode and persists the choice", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    act(() => result.current.toggleMode());

    expect(result.current.mode).toBe("dark");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");

    act(() => result.current.toggleMode());

    expect(result.current.mode).toBe("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("follows a live system preference change when the user hasn't chosen explicitly", () => {
    const { fireChange } = mockMatchMedia(false);
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    expect(result.current.mode).toBe("light");

    act(() => fireChange(true));

    expect(result.current.mode).toBe("dark");
  });

  it("stops following system preference changes once the user has toggled explicitly", () => {
    const { fireChange } = mockMatchMedia(false);
    const { result } = renderHook(() => useThemeMode(), { wrapper });

    act(() => result.current.toggleMode()); // explicit choice: dark
    expect(result.current.mode).toBe("dark");

    act(() => fireChange(false)); // system says light — should be ignored now

    expect(result.current.mode).toBe("dark");
  });

  it("throws when used outside a ThemeModeProvider", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useThemeMode())).toThrow(
      "useThemeMode must be used within a ThemeModeProvider",
    );

    consoleErrorSpy.mockRestore();
  });
});
