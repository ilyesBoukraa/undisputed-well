import { streamAiQuery } from "./ai";
import { ApiError } from "./client";

function fakeStreamResponse(chunks: string[], init: { status?: number } = {}) {
  const status = init.status ?? 200;
  const encoder = new TextEncoder();
  let index = 0;

  return {
    ok: status < 400,
    status,
    statusText: status < 400 ? "OK" : "Error",
    body: {
      getReader: () => ({
        read: async () => {
          if (index < chunks.length) {
            const value = encoder.encode(chunks[index]);
            index += 1;
            return { done: false, value };
          }
          return { done: true, value: undefined };
        },
      }),
    },
  } as unknown as Response;
}

describe("streamAiQuery", () => {
  afterEach(() => {
    jest.resetAllMocks();
    document.cookie = "uw_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("sends the question with the CSRF header", async () => {
    document.cookie = "uw_csrf=my-token";
    global.fetch = jest.fn().mockResolvedValue(fakeStreamResponse(["data: {\"type\":\"done\"}\n\n"]));

    await streamAiQuery("hello", jest.fn());

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/query",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "hello" }),
        headers: expect.objectContaining({ "X-CSRF-Token": "my-token" }),
      }),
    );
  });

  it("parses a full sources/token/done stream delivered in one chunk", async () => {
    const events: unknown[] = [];
    global.fetch = jest.fn().mockResolvedValue(
      fakeStreamResponse([
        'data: {"type":"sources","sources":["Rigs"]}\n\ndata: {"type":"token","token":"Hi "}\n\ndata: {"type":"token","token":"there"}\n\ndata: {"type":"done"}\n\n',
      ]),
    );

    await streamAiQuery("hello", (event) => events.push(event));

    expect(events).toEqual([
      { type: "sources", sources: ["Rigs"] },
      { type: "token", token: "Hi " },
      { type: "token", token: "there" },
      { type: "done" },
    ]);
  });

  it("reassembles an SSE event split across multiple read() chunks", async () => {
    const events: unknown[] = [];
    global.fetch = jest.fn().mockResolvedValue(
      fakeStreamResponse(['data: {"typ', 'e":"token","token":"Hi"}\n\ndata: {"type":"done"}\n\n']),
    );

    await streamAiQuery("hello", (event) => events.push(event));

    expect(events).toEqual([{ type: "token", token: "Hi" }, { type: "done" }]);
  });

  it("throws an ApiError when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeStreamResponse([], { status: 403 }));

    await expect(streamAiQuery("hello", jest.fn())).rejects.toBeInstanceOf(ApiError);
  });

  it("throws an ApiError when the response has no body", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: null });

    await expect(streamAiQuery("hello", jest.fn())).rejects.toBeInstanceOf(ApiError);
  });
});
