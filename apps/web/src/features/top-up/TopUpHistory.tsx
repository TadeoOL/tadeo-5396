import {
  Check,
  CircleHelp,
  Clock,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMxn } from "@/lib/format";
import { useLedger, type TopUpOutcome } from "@/storage/ledger";
import { shortReason } from "./outcome-copy";
import { reconcile, useReconciliationRuns } from "./reconciliation";

const LABELS: Record<
  TopUpOutcome,
  {
    variant: "success" | "warning" | "muted" | "destructive";
    icon: LucideIcon;
    label: string;
  }
> = {
  pending: { variant: "muted", icon: Clock, label: "Processing" },
  unknown: { variant: "warning", icon: CircleHelp, label: "Confirming" },
  credited: { variant: "success", icon: Check, label: "Approved" },
  declined: { variant: "destructive", icon: X, label: "Declined" },
  failed: { variant: "destructive", icon: TriangleAlert, label: "Failed" },
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatWhen(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toDateString() === new Date().toDateString()
    ? timeFormat.format(date)
    : dateTimeFormat.format(date);
}

export function TopUpHistory({ userId }: { userId: string }) {
  const { topUps } = useLedger(userId);
  const runs = useReconciliationRuns();
  return (
    <section
      aria-labelledby="top-ups-heading"
      className="border-b-[1.5px] border-dashed px-4 py-6 md:px-6"
    >
      <h3 id="top-ups-heading">Top-ups</h3>
      {topUps.length === 0 ? (
        <>
          <p>No top-ups yet.</p>
          <p className="text-sm text-muted-foreground">
            Top up with SnailPay to add funds. Every attempt shows up here,
            whatever its result.
          </p>
        </>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead className="hidden md:table-cell">Card</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topUps.toReversed().map((topUp) => {
              const { variant, icon: Icon, label } = LABELS[topUp.outcome];
              const reason = shortReason(topUp);
              const run = runs.get(topUp.id);
              const cardNumber = topUp.charge?.card.card_number;
              return (
                <TableRow key={topUp.id}>
                  <TableCell>{formatWhen(topUp.createdAt)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cardNumber ? `•••• ${cardNumber.slice(-4)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>
                      <Icon aria-hidden />
                      {label}
                    </Badge>
                    {reason !== null && (
                      <p className="text-sm text-muted-foreground">{reason}</p>
                    )}
                    {topUp.outcome === "unknown" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={run?.checking}
                        onClick={() => reconcile(userId, topUp.id)}
                      >
                        {run?.checking ? "Checking…" : "Check again"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatMxn(topUp.amountCents)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
