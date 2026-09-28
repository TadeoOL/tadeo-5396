import type { ChargeRequest } from "@snailrace/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleHelp, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { healthQuery } from "@/api/health";
import { createCharge } from "@/api/snailpay";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatMxn } from "@/lib/format";
import {
  settleTopUp,
  startTopUp,
  useLedger,
  type TopUpOutcome,
} from "@/storage/ledger";
import type { User } from "@/storage/users";
import { outcomeOfCharge } from "./outcome";
import type { TopUpFormValues } from "./schema";
import { TopUpForm, type TopUpAlert } from "./TopUpForm";
import { TopUpReceipt } from "./TopUpReceipt";

const ALERTS: Partial<Record<TopUpOutcome, TopUpAlert>> = {
  declined: {
    tone: "destructive",
    icon: X,
    title: "Top-up declined",
    body: "Your balance did not change.",
  },
  failed: {
    tone: "destructive",
    icon: TriangleAlert,
    title: "Top-up failed",
    body: "Your balance did not change.",
  },
  unknown: {
    tone: "warning",
    icon: CircleHelp,
    title: "Payment not confirmed yet",
    body: "Your balance won't change until it's confirmed.",
  },
};

export function TopUpDialog(props: {
  user: Pick<User, "id" | "fullName" | "email">;
}) {
  const { user } = props;
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
        onSuccess: ({ outcome }) => {
          if (outcome !== "credited") return;
          toast.success("Top-up approved", {
            description: `+${formatMxn(values.amountCents)} added to your balance.`,
          });
        },
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
        ) : (
          <TopUpForm
            defaultName={user.fullName}
            processing={topUp?.outcome === "pending"}
            submitDisabled={server !== "ready" || mutation.isPending}
            alert={(topUp && ALERTS[topUp.outcome]) ?? null}
            server={server}
            onRetryServer={() => void health.refetch()}
            onSubmit={submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
