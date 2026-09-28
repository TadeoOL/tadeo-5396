import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import {
  PublicOnly,
  RedirectHome,
  RequireSession,
} from "@/features/auth/guards";
import { SignIn } from "@/features/auth/SignIn";
import { SignUp } from "@/features/auth/SignUp";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { AppShell } from "./AppShell.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

const queryClient = new QueryClient();

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route element={<PublicOnly />}>
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
              </Route>
              <Route element={<RequireSession />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              <Route path="*" element={<RedirectHome />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
