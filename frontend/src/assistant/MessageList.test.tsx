import { render, screen } from "@testing-library/react";
import type { ChatMessage } from "./useAiChat";
import { MessageList } from "./MessageList";

describe("MessageList", () => {
  it("shows an empty state when there are no messages", () => {
    render(<MessageList messages={[]} />);

    expect(screen.getByTestId("assistant-empty")).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "who can delete a rig" },
      { id: "2", role: "assistant", content: "Only admins." },
    ];
    render(<MessageList messages={messages} />);

    expect(screen.getByTestId("message-list")).toBeInTheDocument();
    expect(screen.getByText("who can delete a rig")).toBeInTheDocument();
    expect(screen.getByText("Only admins.")).toBeInTheDocument();
  });

  it("shows a streaming indicator on an in-progress assistant message", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "assistant", content: "Partial", isStreaming: true },
    ];
    render(<MessageList messages={messages} />);

    expect(screen.getByTestId("message-streaming-1")).toBeInTheDocument();
  });

  it("does not show a streaming indicator once streaming is finished", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "assistant", content: "Done", isStreaming: false },
    ];
    render(<MessageList messages={messages} />);

    expect(screen.queryByTestId("message-streaming-1")).not.toBeInTheDocument();
  });

  it("renders source chips when present", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "assistant", content: "Answer", sources: ["Rigs", "Wells"] },
    ];
    render(<MessageList messages={messages} />);

    expect(screen.getByText("Rigs")).toBeInTheDocument();
    expect(screen.getByText("Wells")).toBeInTheDocument();
  });

  it("renders no source chips when sources is empty", () => {
    const messages: ChatMessage[] = [{ id: "1", role: "assistant", content: "Answer", sources: [] }];
    render(<MessageList messages={messages} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
