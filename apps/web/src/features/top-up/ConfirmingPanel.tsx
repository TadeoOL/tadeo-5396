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
          <DialogTitle>Confirmando tu pago</DialogTitle>
          <p className="text-muted-foreground">
            {formatMxn(props.amountCents)}
          </p>
          <DialogDescription>
            SnailPay no respondió a tiempo, así que estamos verificando si el
            pago se realizó. Tu saldo no cambiará hasta que se confirme.
          </DialogDescription>
          <p role="status" className="flex items-center gap-2">
            <LoaderCircle
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
            Verificando… (intento {run.attempt} de 5)
          </p>
          <DialogClose asChild>
            <Button variant="outline">Cerrar y seguir verificando</Button>
          </DialogClose>
        </>
      ) : (
        <>
          <DialogTitle>Aún sin confirmar</DialogTitle>
          <p className="text-muted-foreground">
            {formatMxn(props.amountCents)}
          </p>
          <DialogDescription>
            SnailPay aún no confirma este pago. Tu saldo no ha cambiado.
            Volveremos a verificar cuando regreses, o puedes verificar ahora.
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
          <Button onClick={props.onCheckAgain}>Verificar de nuevo</Button>
        </>
      )}
    </div>
  );
}
