import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../../api/client";
import { useLoginMutation } from "../../auth/useLoginMutation";
import { BrandMark } from "../../components/BrandMark";
import { ThemeModeToggle } from "../../components/ThemeModeToggle";
import { LoginBackground } from "./LoginBackground";

// Deliberately thin — UI-only concerns (is it shaped like an email, is a
// password present). FastAPI/Pydantic remains the sole authority on whether
// the credentials are actually correct. See PLAN.md validation decision.
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const theme = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  });

  const errorMessage =
    loginMutation.isError &&
    (loginMutation.error instanceof ApiError && loginMutation.error.status === 401
      ? "Invalid email or password."
      : "Something went wrong. Please try again.");

  return (
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      <LoginBackground />

      <Box sx={{ position: "fixed", top: 24, right: 24, zIndex: 2 }}>
        <ThemeModeToggle
          sx={{
            bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
            backdropFilter: "blur(12px)",
            border: 1,
            borderColor: "divider",
            "&:hover": { bgcolor: (t) => alpha(t.palette.background.paper, 0.9) },
          }}
        />
      </Box>

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3.5 }}>
          <BrandMark size={30} />
          <Typography
            component="span"
            sx={{
              fontFamily: theme.typography.h1.fontFamily,
              fontWeight: 700,
              fontSize: "1.35rem",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            UndisputedWell
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4.5 },
            pt: 4,
            width: "100%",
            maxWidth: 400,
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: (t) => alpha(t.palette.background.paper, t.palette.mode === "dark" ? 0.8 : 1),
            backdropFilter: "blur(20px)",
            boxShadow: (t) =>
              t.palette.mode === "dark"
                ? "0 30px 80px -20px rgba(0, 0, 0, 0.6)"
                : "0 20px 60px -20px rgba(16, 21, 31, 0.25)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.25,
              fontFamily: theme.typography.fontFamilyMono,
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "accent.main",
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "accent.main",
                boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.accent.main, 0.2)}`,
              }}
            />
            Field access terminal
          </Box>

          <Typography variant="h5" component="h1" gutterBottom sx={{ textWrap: "balance" }}>
            Sign in to UndisputedWell
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Well &amp; rig telemetry, threshold alerts, and predictions — one login, every site.
          </Typography>

          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 2 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  autoComplete="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                />
              )}
            />

            {errorMessage && (
              <Alert severity="error" data-testid="login-error" sx={{ mt: 1 }}>
                {errorMessage}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
