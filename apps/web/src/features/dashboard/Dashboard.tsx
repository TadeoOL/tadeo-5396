import { CircleHelp } from "lucide-react";
import { ScreenTitle } from "@/app/ScreenTitle";
import { formatMxn } from "@/lib/format";
import { useResumeReconciliation } from "@/features/top-up/reconciliation";
import { SimulationControls } from "@/features/top-up/SimulationControls";
import { TopUpDialog } from "@/features/top-up/TopUpDialog";
import { TopUpHistory } from "@/features/top-up/TopUpHistory";
import { useLedger } from "@/storage/ledger";
import { useSession } from "@/storage/session";
import type { User } from "@/storage/users";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function Dashboard() {
  const session = useSession();
  if (session.status !== "signed-in") return null;
  const { user } = session;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="border-b-[1.5px] border-dashed px-4 pt-6 md:px-6">
        <ScreenTitle title="Dashboard">Hi, {user.fullName}</ScreenTitle>
        <p className="text-sm text-muted-foreground">
          Race day · {dateFormat.format(new Date())} · simulated
        </p>
      </div>
      <BalanceRegion user={user} />
      <TopUpHistory userId={user.id} />
      <SimulationControls />
    </div>
  );
}

function BalanceRegion({ user }: { user: User }) {
  const { balanceCents, topUps } = useLedger(user.id);
  useResumeReconciliation(user.id);
  const confirmingCents = topUps
    .filter((t) => t.outcome === "pending" || t.outcome === "unknown")
    .reduce((sum, t) => sum + t.amountCents, 0);
  return (
    <section
      aria-labelledby="balance-heading"
      className="flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-dashed px-4 pt-4 pb-6 md:px-6"
    >
      <h3 id="balance-heading">Balance</h3>
      <p>
        <span className="text-5xl font-black [font-stretch:75%]">
          {formatMxn(balanceCents)}
        </span>{" "}
        <span className="text-sm font-bold text-muted-foreground">MXN</span>
      </p>
      {confirmingCents > 0 && (
        <p className="flex basis-full items-center gap-2 text-sm text-warning">
          <CircleHelp aria-hidden className="size-4" />
          {formatMxn(confirmingCents)} being confirmed, not included yet
        </p>
      )}
      <TopUpDialog user={user} />
    </section>
  );
}
