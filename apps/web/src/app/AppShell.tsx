import { Outlet, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { endSession, useSession } from "@/storage/session";

export function AppShell() {
  const session = useSession();
  const navigate = useNavigate();
  return (
    <>
      <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
        <span className="text-2xl font-black uppercase [font-stretch:62%]">
          Snailrace
        </span>
        {session.status === "signed-in" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden md:inline">{session.user.fullName}</span>
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground focus-visible:ring-primary-foreground"
              onClick={() => {
                endSession();
                void navigate("/sign-in", { replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
