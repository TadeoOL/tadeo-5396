import { Outlet } from "react-router";

export function AppShell() {
  return (
    <>
      <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
        <span className="text-2xl font-black uppercase [font-stretch:62%]">
          Snailrace
        </span>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
