import { Box, Button, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { MessageList } from "../../assistant/MessageList";
import { useAiChat } from "../../assistant/useAiChat";
import { NavBar } from "../../components/NavBar";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";

export function AssistantPage() {
  const { messages, isStreaming, sendMessage } = useAiChat();
  const [question, setQuestion] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;
    setQuestion("");
    void sendMessage(trimmed);
  }

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      <PageHeader eyebrow="Knowledge base" title="AI Assistant" />
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Answers are grounded in UndisputedWell's own documentation — it can't see live well or
        operations data, and says so when it doesn't know something.
      </Typography>

      <Panel sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <MessageList messages={messages} />

        <Box component="form" onSubmit={onSubmit} sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Ask a question"
            size="small"
            fullWidth
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isStreaming}
          />
          <Button type="submit" variant="contained" disabled={isStreaming || !question.trim()}>
            {isStreaming ? "Thinking…" : "Send"}
          </Button>
        </Box>
      </Panel>
    </Box>
  );
}
