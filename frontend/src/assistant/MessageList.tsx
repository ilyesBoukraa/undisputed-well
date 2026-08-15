import { Alert, Box, Chip, Paper, Typography } from "@mui/material";
import type { ChatMessage } from "./useAiChat";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <Alert severity="info" data-testid="assistant-empty">
        Ask a question about UndisputedWell — wells and rigs, thresholds and alerts,
        asphaltene prediction, roles, or authentication.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }} data-testid="message-list">
      {messages.map((message) => (
        <Box
          key={message.id}
          data-testid={`message-${message.id}`}
          sx={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}
        >
          <Paper
            sx={{
              p: 2,
              maxWidth: "75%",
              bgcolor: message.role === "user" ? "primary.main" : "background.paper",
              color: message.role === "user" ? "primary.contrastText" : "text.primary",
            }}
            elevation={1}
          >
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {message.content}
              {message.isStreaming && (
                <Box component="span" data-testid={`message-streaming-${message.id}`}>
                  {" "}
                  ▊
                </Box>
              )}
            </Typography>

            {message.sources && message.sources.length > 0 && (
              <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {message.sources.map((source) => (
                  <Chip key={source} size="small" label={source} variant="outlined" />
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      ))}
    </Box>
  );
}
