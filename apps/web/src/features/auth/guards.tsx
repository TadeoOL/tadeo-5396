import { Navigate, Outlet } from "react-router";
import { useSession } from "@/storage/session";

export type SignInState = { sessionExpired: true };

function signInState(expired: boolean): SignInState | undefined {
  return expired ? { sessionExpired: true } : undefined;
}

export function RequireSession() {
  const session = useSession();
  if (session.status === "signed-in") return <Outlet />;
  return (
    <Navigate to="/sign-in" replace state={signInState(session.expired)} />
  );
}

export function PublicOnly() {
  const session = useSession();
  if (session.status === "signed-in") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

export function RedirectHome() {
  const session = useSession();
  if (session.status === "signed-in") {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <Navigate to="/sign-in" replace state={signInState(session.expired)} />
  );
}
