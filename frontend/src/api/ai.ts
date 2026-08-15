import { CSRF_HEADER_NAME, readCsrfToken } from "./csrf";
import { ApiError } from "./client";

export type AiStreamEvent =
  | { type: "sources"; sources: string[] }
  | { type: "token"; token: string }
  | { type: "done" };

/**
 * Streams an AI assistant answer. Deliberately fetch()+ReadableStream, not
 * EventSource: EventSource only supports GET (no request body for the
 * question), and browsers auto-reconnect a closed EventSource connection —
 * wrong behavior for a one-shot, naturally-terminating answer stream. fetch
 * gives full control over when to stop reading, which is what a finite
 * stream needs.
 */
export async function streamAiQuery(
  question: string,
  onEvent: (event: AiStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/ai/query", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      [CSRF_HEADER_NAME]: readCsrfToken() ?? "",
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new ApiError(response.status, `AI query failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
      if (dataLine) {
        onEvent(JSON.parse(dataLine.slice("data:".length).trim()) as AiStreamEvent);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}
