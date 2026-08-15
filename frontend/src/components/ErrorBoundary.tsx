import { Alert, Box, Button, Typography } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  // Injectable for tests — jsdom's window.location.assign is non-writable
  // and non-configurable, so it can't be stubbed after the fact; a prop
  // with a real default is simpler than fighting that.
  onReload?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level render-error catch-all (see App.tsx). React error boundaries
 * must be class components — there's no hook equivalent — and only catch
 * errors thrown during render/lifecycle, not inside event handlers or async
 * callbacks (those already have their own try/catch paths, e.g.
 * useAiChat's stream error handling). Without this, an unexpected render
 * error white-screens the whole app with no way back short of a manual URL
 * edit.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info.componentStack);
  }

  handleReload = () => {
    (this.props.onReload ?? (() => window.location.assign("/")))();
  };

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <Box sx={{ maxWidth: 480, width: "100%" }}>
            <Alert severity="error" data-testid="error-boundary" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Something went wrong.
              </Typography>
              <Typography variant="body2">
                An unexpected error occurred. Reloading usually resolves it; if it keeps
                happening, contact your administrator.
              </Typography>
            </Alert>
            <Button variant="contained" onClick={this.handleReload}>
              Reload UndisputedWell
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
