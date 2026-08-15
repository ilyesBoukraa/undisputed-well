import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RequirePermission } from "./auth/RequirePermission";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AssistantPage } from "./pages/assistant/AssistantPage";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Login } from "./pages/login/Login";
import { NotFound } from "./pages/NotFound";
import { OperationsPage } from "./pages/operations/OperationsPage";
import { PredictionPage } from "./pages/predictions/PredictionPage";
import { appPersister, createAppQueryClient, PERSIST_MAX_AGE_MS, shouldPersistQuery } from "./queryClient";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import { RigCreatePage } from "./pages/rigs/RigCreatePage";
import { RigDetailPage } from "./pages/rigs/RigDetailPage";
import { RigEditPage } from "./pages/rigs/RigEditPage";
import { RigsListPage } from "./pages/rigs/RigsListPage";
import { WellCreatePage } from "./pages/wells/WellCreatePage";
import { WellDetailPage } from "./pages/wells/WellDetailPage";
import { WellEditPage } from "./pages/wells/WellEditPage";
import { WellsListPage } from "./pages/wells/WellsListPage";

export const queryClient = createAppQueryClient();

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: appPersister,
        maxAge: PERSIST_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      <ThemeModeProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Dashboard />} />

                  <Route path="/rigs" element={<RigsListPage />} />
                  <Route path="/rigs/:rigId" element={<RigDetailPage />} />
                  <Route element={<RequirePermission permission="rig:edit" />}>
                    <Route path="/rigs/new" element={<RigCreatePage />} />
                    <Route path="/rigs/:rigId/edit" element={<RigEditPage />} />
                  </Route>

                  <Route path="/wells" element={<WellsListPage />} />
                  <Route path="/wells/:wellId" element={<WellDetailPage />} />
                  <Route element={<RequirePermission permission="well:edit" />}>
                    <Route path="/wells/new" element={<WellCreatePage />} />
                    <Route path="/wells/:wellId/edit" element={<WellEditPage />} />
                  </Route>

                  <Route path="/operations" element={<OperationsPage />} />
                  <Route path="/predictions" element={<PredictionPage />} />

                  <Route element={<RequirePermission permission="ai:query" />}>
                    <Route path="/assistant" element={<AssistantPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeModeProvider>
    </PersistQueryClientProvider>
  );
}
