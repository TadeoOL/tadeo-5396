import { Button } from "@/components/ui/button";
import { AuthLayout } from "./AuthLayout.tsx";
import { ScreenTitle } from "./ScreenTitle.tsx";

export function UnreadableDataScreen(props: { onReset: () => void }) {
  return (
    <main>
      <AuthLayout>
        <ScreenTitle title="Your saved data can't be read">
          Your saved data can't be read
        </ScreenTitle>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          The data this browser keeps for Snailrace is damaged, so we won't
          guess your balance. Resetting removes every account and top-up saved
          in this browser.
        </p>
        <Button className="w-full" onClick={props.onReset}>
          Reset local data
        </Button>
      </AuthLayout>
    </main>
  );
}

export function RenderErrorScreen() {
  return (
    <main>
      <AuthLayout>
        <ScreenTitle title="Something went wrong">
          Something went wrong
        </ScreenTitle>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          The page hit an unexpected error. Your balance and top-ups are safe in
          this browser.
        </p>
        <Button className="w-full" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </AuthLayout>
    </main>
  );
}
