import { TextDecoder, TextEncoder } from "node:util";
import "@testing-library/jest-dom";

// jsdom doesn't provide these globals, but react-router needs them.
Object.assign(global, { TextEncoder, TextDecoder });

// jsdom doesn't implement ResizeObserver; @mui/x-charts' auto-sizing
// container (used by PredictionChart) needs one to mount at all.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(global, { ResizeObserver: ResizeObserverMock });

// jest-environment-jsdom's global scope doesn't include structuredClone
// (a real Node/browser global elsewhere) — @mui/x-charts uses it
// internally. A JSON round-trip is sufficient here since chart series/axis
// config is plain data (no functions, Dates, etc).
if (typeof global.structuredClone !== "function") {
  global.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}

// jsdom doesn't implement matchMedia at all — ThemeModeProvider uses it to
// read/watch the OS's prefers-color-scheme. Defaults to "no system
// preference matched" (matches: false); tests that care about dark-mode
// system-preference behavior override window.matchMedia themselves.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
