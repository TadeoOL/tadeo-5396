import { CircleHelp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMxn } from "@/lib/format";
import type { ReconciliationRun } from "./reconciliation";

export function ConfirmingPanel(props: {
  amountCents: number;
  run: ReconciliationRun | undefined;
  onCheckAgain: () => void;
}) {
  const { run } = props;
  return (
    <div className="grid gap-4">
      <CircleHelp aria-hidden className="text-warning" />
      {run?.checking ? (
        <>
          <DialogTitle>Confirming your payment</DialogTitle>
          <p className="text-muted-foreground">
            {formatMxn(props.amountCents)}
          </p>
          <DialogDescription>
            SnailPay didn't answer in time, so we're checking whether the
            payment went through. Your balance won't change until it's
            confirmed.
          </DialogDescription>
          <p role="status" className="flex items-center gap-2">
            <LoaderCircle
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
            Checking… (attempt {run.attempt} of 5)
          </p>
          <DialogClose asChild>
            <Button variant="outline">Close, keep checking</Button>
          </DialogClose>
        </>
      ) : (
        <>
          <DialogTitle>Not confirmed yet</DialogTitle>
          <p className="text-muted-foreground">
            {formatMxn(props.amountCents)}
          </p>
          <DialogDescription>
            SnailPay hasn't confirmed this payment yet. Your balance hasn't
            changed. We'll check again when you come back, or you can check now.
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={props.onCheckAgain}>Check again</Button>
        </>
      )}
    </div>
  );
}
