import { useEffect, useRef, useState } from "react";
import type { Alert } from "../api/operations";

export type AlertStreamStatus = "connecting" | "open" | "error";

/**
 * Thin wrapper around the browser's native EventSource for
 * /api/operations/alerts/stream. Reconnection (including the standard
 * Last-Event-ID resume — see the backend's stream_alerts docstring) is
 * handled natively by EventSource; this hook just surfaces connection
 * status and forwards each parsed alert to the caller.
 *
 * `onAlert` is read through a ref so identity changes on every render (e.g.
 * an inline arrow function) don't tear down and reopen the connection.
 */
export function useAlertStream(onAlert: (alert: Alert) => void): AlertStreamStatus {
  const [status, setStatus] = useState<AlertStreamStatus>("connecting");
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    const source = new EventSource("/api/operations/alerts/stream");

    source.onopen = () => setStatus("open");
    source.onerror = () => setStatus("error");
    source.onmessage = (event: MessageEvent<string>) => {
      const alert = JSON.parse(event.data) as Alert;
      onAlertRef.current(alert);
    };

    return () => source.close();
  }, []);

  return status;
}
