import { toast } from "sonner";
import { formatMxn } from "@/lib/format";
import type { TopUp } from "@/storage/ledger";
import { copyOf } from "./outcome-copy";

export function announceOutcome(
  topUp: Pick<TopUp, "amountCents" | "outcome" | "charge">,
): void {
  const amount = formatMxn(topUp.amountCents);
  if (topUp.outcome === "credited")
    toast.success("Recarga aprobada", {
      description: `+${amount} agregados a tu saldo.`,
    });
  else if (topUp.outcome === "declined")
    toast.error("Recarga rechazada", {
      description: `${amount} · ${copyOf(topUp.charge).shortReason}`,
    });
  else if (topUp.outcome === "failed")
    toast.error("Recarga fallida", {
      description: `${amount} · ${copyOf(topUp.charge).shortReason}`,
    });
  else if (topUp.outcome === "unknown")
    toast.warning("Pago aún sin confirmar", {
      description: `${amount} · Estamos verificando con SnailPay.`,
    });
}
