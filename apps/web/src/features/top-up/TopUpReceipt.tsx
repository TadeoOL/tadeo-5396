import type { ChargeResponse } from "@snailrace/contracts";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMxn } from "@/lib/format";

export function TopUpReceipt(props: {
  amountCents: number;
  balanceCents: number;
  charge: ChargeResponse;
}) {
  const { charge } = props;
  return (
    <div className="grid gap-4">
      <Check aria-hidden className="text-success" />
      <DialogTitle>Payment approved</DialogTitle>
      <p className="text-5xl font-black">+{formatMxn(props.amountCents)}</p>
      <DialogDescription>
        Added to your balance. New balance: {formatMxn(props.balanceCents)}
      </DialogDescription>
      <dl>
        <dt>Card</dt>
        <dd>•••• {charge.card.card_number?.slice(-4)}</dd>
        <dt>Authorization code</dt>
        <dd>{charge.authorization_code}</dd>
        <dt>Reference</dt>
        <dd>
          {charge.reference?.slice(0, 8)}…{charge.reference?.slice(-4)}
        </dd>
      </dl>
      <DialogClose asChild>
        <Button>Done</Button>
      </DialogClose>
    </div>
  );
}
