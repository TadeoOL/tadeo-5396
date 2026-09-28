import { toast } from "sonner";
import { formatMxn } from "@/lib/format";
import type { TopUp } from "@/storage/ledger";
import { copyOf } from "./outcome-copy";

export function announceOutcome(
  topUp: Pick<TopUp, "amountCents" | "outcome" | "charge">,
): void {
  const amount = formatMxn(topUp.amountCents);
  if (topUp.outcome === "credited")
    toast.success("Top-up approved", {
      description: `+${amount} added to your balance.`,
    });
  else if (topUp.outcome === "declined")
    toast.error("Top-up declined", {
      description: `${amount} · ${copyOf(topUp.charge).shortReason}`,
    });
  else if (topUp.outcome === "failed")
    toast.error("Top-up failed", {
      description: `${amount} · ${copyOf(topUp.charge).shortReason}`,
    });
  else if (topUp.outcome === "unknown")
    toast.warning("Payment not confirmed yet", {
      description: `${amount} · We're checking with SnailPay.`,
    });
}
