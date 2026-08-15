import { act, renderHook, waitFor } from "@testing-library/react";
import type { AiStreamEvent } from "../api/ai";
import { streamAiQuery } from "../api/ai";
import { useAiChat } from "./useAiChat";

jest.mock("../api/ai");
const mockStreamAiQuery = streamAiQuery as jest.MockedFunction<typeof streamAiQuery>;

describe("useAiChat", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("appends a user message and a streaming placeholder assistant message immediately", async () => {
    mockStreamAiQuery.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useAiChat());

    act(() => {
      void result.current.sendMessage("who can delete a rig");
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[0]).toMatchObject({ role: "user", content: "who can delete a rig" });
    expect(result.current.messages[1]).toMatchObject({ role: "assistant", content: "", isStreaming: true });
    expect(result.current.isStreaming).toBe(true);
  });

  it("appends tokens to the assistant message as they stream in", async () => {
    mockStreamAiQuery.mockImplementation(async (_q, onEvent) => {
      onEvent({ type: "sources", sources: ["Rigs"] });
      onEvent({ type: "token", token: "Only " });
      onEvent({ type: "token", token: "admins." });
      onEvent({ type: "done" });
    });
    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage("who can delete a rig");
    });

    const assistantMessage = result.current.messages[1];
    expect(assistantMessage.content).toBe("Only admins.");
    expect(assistantMessage.sources).toEqual(["Rigs"]);
    expect(assistantMessage.isStreaming).toBe(false);
    expect(result.current.isStreaming).toBe(false);
  });

  it("marks the assistant message as an error when the stream rejects", async () => {
    mockStreamAiQuery.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage("who can delete a rig");
    });

    const assistantMessage = result.current.messages[1];
    expect(assistantMessage.isError).toBe(true);
    expect(assistantMessage.isStreaming).toBe(false);
    expect(assistantMessage.content).toBe("Something went wrong. Please try again.");
    expect(result.current.isStreaming).toBe(false);
  });

  it("supports multiple messages accumulating in order", async () => {
    mockStreamAiQuery.mockImplementation(async (_q, onEvent) => {
      onEvent({ type: "token", token: "answer" } as AiStreamEvent);
      onEvent({ type: "done" });
    });
    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage("first question");
    });
    await act(async () => {
      await result.current.sendMessage("second question");
    });

    expect(result.current.messages).toHaveLength(4);
    expect(result.current.messages[0].content).toBe("first question");
    expect(result.current.messages[2].content).toBe("second question");
  });
});
