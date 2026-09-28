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
      <DialogTitle>Pago aprobado</DialogTitle>
      <p className="text-5xl font-black">+{formatMxn(props.amountCents)}</p>
      <DialogDescription>
        Se agregó a tu saldo. Nuevo saldo: {formatMxn(props.balanceCents)}
      </DialogDescription>
      <dl>
        <dt>Tarjeta</dt>
        <dd>•••• {charge.card.card_number?.slice(-4)}</dd>
        <dt>Código de autorización</dt>
        <dd>{charge.authorization_code}</dd>
        <dt>Referencia</dt>
        <dd>
          {charge.reference?.slice(0, 8)}…{charge.reference?.slice(-4)}
        </dd>
      </dl>
      <DialogClose asChild>
        <Button>Listo</Button>
      </DialogClose>
    </div>
  );
}
