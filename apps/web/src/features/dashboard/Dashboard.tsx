import { ScreenTitle } from "@/app/ScreenTitle";
import { formatMxn } from "@/lib/format";
import { TopUpDialog } from "@/features/top-up/TopUpDialog";
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
    </div>
  );
}

function BalanceRegion({ user }: { user: User }) {
  const { balanceCents } = useLedger(user.id);
  return (
    <section
      aria-labelledby="balance-heading"
      className="flex flex-wrap items-end justify-between gap-4 px-4 pt-4 pb-6 md:px-6"
    >
      <h3 id="balance-heading">Balance</h3>
      <p>
        <span className="text-5xl font-black [font-stretch:75%]">
          {formatMxn(balanceCents)}
        </span>{" "}
        <span className="text-sm font-bold text-muted-foreground">MXN</span>
      </p>
      <TopUpDialog user={user} />
    </section>
  );
}
