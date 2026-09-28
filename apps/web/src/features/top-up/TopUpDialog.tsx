import type { ChargeRequest } from "@snailrace/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { healthQuery } from "@/api/health";
import { createCharge } from "@/api/snailpay";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  settleTopUp,
  startTopUp,
  useLedger,
  type TopUp,
} from "@/storage/ledger";
import type { User } from "@/storage/users";
import { announceOutcome } from "./announce";
import { ConfirmingPanel } from "./ConfirmingPanel";
import { outcomeOfCharge } from "./outcome";
import { copyOf, MISMATCHED_FIELD } from "./outcome-copy";
import { reconcile, useReconciliationRuns } from "./reconciliation";
import type { TopUpFormValues } from "./schema";
import { TopUpForm, type TopUpAlert } from "./TopUpForm";
import { TopUpReceipt } from "./TopUpReceipt";

function alertOf(topUp: TopUp | undefined): TopUpAlert | null {
  if (!topUp) return null;
  const copy = copyOf(topUp.charge);
  if (topUp.outcome === "declined")
    return {
      tone: "destructive",
      icon: X,
      title: copy.title,
      body: "Your balance did not change. " + copy.body,
    };
  if (topUp.outcome === "failed")
    return {
      tone: "destructive",
      icon: TriangleAlert,
      title: copy.title,
      body: copy.body,
    };
  return null;
}

export function TopUpDialog(props: {
  user: Pick<User, "id" | "fullName" | "email">;
}) {
  const { user } = props;
  const runs = useReconciliationRuns();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const ledger = useLedger(user.id);
  const topUp = ledger.topUps.find((t) => t.id === activeId);

  const health = useQuery(healthQuery);
  const server =
    health.isSuccess && !health.isFetching
      ? "ready"
      : health.isError && !health.isFetching
        ? "unreachable"
        : "waking";

  const mutation = useMutation({
    retry: 0,
    mutationFn: async ({
      id,
      charge,
    }: {
      id: string;
      charge: ChargeRequest;
    }) => {
      const settlement = outcomeOfCharge(await createCharge(charge, id), id);
      settleTopUp(user.id, id, settlement.outcome, settlement.charge);
      if (settlement.outcome === "unknown") reconcile(user.id, id);
      return settlement;
    },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setActiveId(null);
      void health.refetch();
    }
  }

  function submit(values: TopUpFormValues) {
    const id = crypto.randomUUID();
    startTopUp(user.id, { id, amountCents: values.amountCents });
    setActiveId(id);
    mutation.mutate(
      {
        id,
        charge: {
          ...values.card,
          transaction_amount: values.amountCents,
          payer_id: user.id,
          payer_email: user.email,
        },
      },
      {
        onSuccess: (settled) =>
          announceOutcome({ amountCents: values.amountCents, ...settled }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">Top up</Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {topUp?.outcome === "credited" && topUp.charge ? (
          <TopUpReceipt
            amountCents={topUp.amountCents}
            balanceCents={ledger.balanceCents}
            charge={topUp.charge}
          />
        ) : topUp?.outcome === "unknown" ? (
          <ConfirmingPanel
            amountCents={topUp.amountCents}
            run={runs.get(topUp.id)}
            onCheckAgain={() => reconcile(user.id, topUp.id)}
          />
        ) : (
          <TopUpForm
            defaultName={user.fullName}
            processing={topUp?.outcome === "pending"}
            submitDisabled={server !== "ready" || mutation.isPending}
            alert={alertOf(topUp)}
            mismatchedField={
              topUp?.outcome === "declined" && topUp.charge
                ? (MISMATCHED_FIELD[topUp.charge.status_detail] ?? null)
                : null
            }
            server={server}
            onRetryServer={() => void health.refetch()}
            onSubmit={submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
