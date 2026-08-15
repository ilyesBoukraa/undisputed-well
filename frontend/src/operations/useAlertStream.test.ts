import { act, renderHook } from "@testing-library/react";
import { FakeEventSource, installFakeEventSource } from "../test/renderWithProviders";
import { useAlertStream } from "./useAlertStream";

describe("useAlertStream", () => {
  beforeEach(() => {
    installFakeEventSource();
  });

  it("connects to the alert stream endpoint", () => {
    renderHook(() => useAlertStream(jest.fn()));

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe("/api/operations/alerts/stream");
  });

  it("reports open status once the connection opens", () => {
    const { result } = renderHook(() => useAlertStream(jest.fn()));

    expect(result.current).toBe("connecting");
    act(() => FakeEventSource.instances[0].onopen?.());
    expect(result.current).toBe("open");
  });

  it("reports error status when the connection errors (before EventSource auto-reconnects)", () => {
    const { result } = renderHook(() => useAlertStream(jest.fn()));

    act(() => FakeEventSource.instances[0].onerror?.());
    expect(result.current).toBe("error");
  });

  it("forwards parsed alerts from incoming messages", () => {
    const onAlert = jest.fn();
    renderHook(() => useAlertStream(onAlert));

    const alert = {
      id: 1,
      well_id: 2,
      metric: "pressure",
      value: 150,
      severity: "critical",
      acknowledged: false,
      created_at: "2026-01-01T00:00:00Z",
    };
    FakeEventSource.instances[0].onmessage?.({ data: JSON.stringify(alert) });

    expect(onAlert).toHaveBeenCalledWith(alert);
  });

  it("does not reconnect when a new onAlert callback identity is passed", () => {
    const { rerender } = renderHook(({ cb }) => useAlertStream(cb), {
      initialProps: { cb: jest.fn() },
    });

    rerender({ cb: jest.fn() });

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("still delivers alerts to the latest callback after a rerender", () => {
    const firstCb = jest.fn();
    const secondCb = jest.fn();
    const { rerender } = renderHook(({ cb }) => useAlertStream(cb), {
      initialProps: { cb: firstCb },
    });

    rerender({ cb: secondCb });

    const alert = {
      id: 1,
      well_id: 2,
      metric: "pressure",
      value: 150,
      severity: "critical",
      acknowledged: false,
      created_at: "2026-01-01T00:00:00Z",
    };
    FakeEventSource.instances[0].onmessage?.({ data: JSON.stringify(alert) });

    expect(firstCb).not.toHaveBeenCalled();
    expect(secondCb).toHaveBeenCalledWith(alert);
  });

  it("closes the connection on unmount", () => {
    const { unmount } = renderHook(() => useAlertStream(jest.fn()));

    unmount();

    expect(FakeEventSource.instances[0].closed).toBe(true);
  });
});
