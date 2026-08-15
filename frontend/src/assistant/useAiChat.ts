import { useCallback, useRef, useState } from "react";
import { streamAiQuery } from "../api/ai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isStreaming?: boolean;
  isError?: boolean;
}

/**
 * Chat is deliberately ephemeral, client-side-only state — there's no
 * backend history endpoint (see api/ai.py's docstring); each session starts
 * with an empty conversation, matching a typical assistant-panel widget
 * rather than a persisted record.
 */
export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const nextId = useRef(0);

  const sendMessage = useCallback(async (question: string) => {
    const userMessageId = String(nextId.current++);
    const assistantMessageId = String(nextId.current++);

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: question },
      { id: assistantMessageId, role: "assistant", content: "", isStreaming: true },
    ]);
    setIsStreaming(true);

    function updateAssistant(update: Partial<ChatMessage>) {
      setMessages((prev) =>
        prev.map((message) => (message.id === assistantMessageId ? { ...message, ...update } : message)),
      );
    }

    try {
      await streamAiQuery(question, (event) => {
        if (event.type === "sources") {
          updateAssistant({ sources: event.sources });
        } else if (event.type === "token") {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + event.token }
                : message,
            ),
          );
        } else if (event.type === "done") {
          updateAssistant({ isStreaming: false });
        }
      });
    } catch {
      updateAssistant({
        isStreaming: false,
        isError: true,
        content: "Something went wrong. Please try again.",
      });
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, sendMessage };
}
