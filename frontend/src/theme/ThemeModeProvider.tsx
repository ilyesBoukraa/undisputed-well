import { CssBaseline, ThemeProvider } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./fonts.css";
import { createAppTheme } from "./theme";

const STORAGE_KEY = "undisputedwell-theme-mode";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isThemeMode(value: string | null): value is PaletteMode {
  return value === "light" || value === "dark";
}

function getStoredMode(): PaletteMode | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemeMode(stored) ? stored : null;
}

function getSystemPreference(): PaletteMode {
  if (typeof window.matchMedia !== "function") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

/**
 * Owns the light/dark mode decision — an explicit user choice (persisted to
 * localStorage) if one exists, otherwise the OS's prefers-color-scheme,
 * tracked live so the app follows a system theme change until the user
 * overrides it — and wraps children in the resulting MUI theme, so App.tsx
 * and tests only need this one provider instead of wiring mode state and
 * ThemeProvider/CssBaseline separately.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => getStoredMode() ?? getSystemPreference());
  const hasExplicitPreference = useRef(getStoredMode() !== null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (hasExplicitPreference.current) return;
      setMode(event.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((previous) => {
      const next: PaletteMode = previous === "light" ? "dark" : "light";
      hasExplicitPreference.current = true;
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const contextValue = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);
  const muiTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        {/* enableColorScheme sets CSS color-scheme on <html> to match the
            mode, so native browser widgets (scrollbars, form controls,
            etc.) render dark/light correctly too, not just MUI's own
            components. */}
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return context;
}
