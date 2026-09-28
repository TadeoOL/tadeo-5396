import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/FormAlert";
import { TextField } from "@/components/TextField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScenarioCard } from "@snailrace/contracts";
import { formatMxn } from "@/lib/format";
import {
  parseAmountCents,
  topUpFormSchema,
  type TopUpFormInput,
  type TopUpFormValues,
} from "./schema";

export type TopUpAlert = {
  tone: "destructive" | "warning";
  icon: LucideIcon;
  title: string;
  body: string;
};

const CARD_LABELS: Record<ScenarioCard, string> = {
  "1234123412341234": "Aprobada",
  "1234123412340002": "Rechazada: fondos insuficientes",
  "1234123412340003": "Rechazada: seguridad",
  "1234123412340004": "Sin respuesta a tiempo (tiempo agotado)",
};

export function TopUpForm(props: {
  defaultName: string;
  processing: boolean;
  submitDisabled: boolean;
  alert: TopUpAlert | null;
  mismatchedField: "cardNumber" | "expiry" | "cvv" | null;
  server: "waking" | "unreachable" | "ready";
  onRetryServer: () => void;
  onSubmit: (values: TopUpFormValues) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<TopUpFormInput, unknown, TopUpFormValues>({
    resolver: zodResolver(topUpFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      amount: "",
      cardNumber: "",
      expiry: "",
      cvv: "",
      cardholderName: props.defaultName,
    },
  });
  useEffect(() => setFocus("amount"), [setFocus]);
  const { mismatchedField } = props;
  useEffect(() => {
    if (mismatchedField)
      setError(mismatchedField, {
        type: "mismatch",
        message: "No coincide con esta tarjeta.",
      });
  }, [mismatchedField, setError]);
  const cents = parseAmountCents(useWatch({ control, name: "amount" }));

  const amount = register("amount");
  const cardNumber = register("cardNumber");
  const expiry = register("expiry");
  const cvv = register("cvv");
  const cardholderName = register("cardholderName");

  const submit = handleSubmit((values) => {
    try {
      props.onSubmit(values);
    } catch {
      setError("root", {
        message:
          "No se pudo guardar esta recarga. Libera espacio de almacenamiento del navegador e intenta de nuevo.",
      });
    }
  });

  const { processing, alert } = props;
  let label = "Recargar";
  if (processing) label = "Procesando…";
  else if (alert?.tone === "destructive") label = "Intentar de nuevo";
  else if (cents !== null) label = `Recargar ${formatMxn(cents)}`;

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="grid gap-4"
    >
      <DialogTitle>Recarga tu saldo</DialogTitle>
      <DialogDescription>
        Se paga con SnailPay, una pasarela simulada. Usa una tarjeta de prueba,
        nunca una real.
      </DialogDescription>
      {props.server === "waking" ? (
        <Alert role="status">
          <LoaderCircle
            aria-hidden
            className="animate-spin motion-reduce:animate-none"
          />
          <AlertTitle>Despertando el servidor.</AlertTitle>
          <AlertDescription>
            Esto puede tardar hasta un minuto.
          </AlertDescription>
        </Alert>
      ) : props.server === "unreachable" ? (
        <>
          <Alert variant="destructive">
            <AlertTitle>No se puede conectar con el servidor.</AlertTitle>
            <AlertDescription>Revisa tu conexión.</AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={props.onRetryServer}>
            Intentar de nuevo
          </Button>
        </>
      ) : processing ? (
        <Alert role="status">
          <LoaderCircle
            aria-hidden
            className="animate-spin motion-reduce:animate-none"
          />
          <AlertTitle>Procesando tu pago…</AlertTitle>
          <AlertDescription>
            Puedes cerrar esta ventana. El resultado aparecerá en tus recargas.
          </AlertDescription>
        </Alert>
      ) : (
        alert && (
          <FormAlert variant={alert.tone}>
            <alert.icon aria-hidden />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>{alert.body}</AlertDescription>
          </FormAlert>
        )
      )}
      {errors.root && (
        <FormAlert variant="destructive">
          <AlertTitle>{errors.root.message}</AlertTitle>
        </FormAlert>
      )}
      <TextField
        id="top-up-amount"
        label="Monto (MXN)"
        inputMode="decimal"
        placeholder="0.00"
        {...amount}
        error={errors.amount?.message}
        readOnly={processing}
      />
      <TextField
        id="top-up-card-number"
        label="Número de tarjeta"
        inputMode="numeric"
        autoComplete="off"
        {...cardNumber}
        onChange={(event) => {
          event.target.value = event.target.value
            .replace(/\D/g, "")
            .slice(0, 16)
            .replace(/(\d{4})(?=\d)/g, "$1 ");
          void cardNumber.onChange(event);
        }}
        error={errors.cardNumber?.message}
        readOnly={processing}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="top-up-expiry"
          label="Vencimiento"
          placeholder="MM/AA"
          inputMode="numeric"
          autoComplete="off"
          {...expiry}
          onChange={(event) => {
            event.target.value = event.target.value
              .replace(/\D/g, "")
              .slice(0, 4)
              .replace(/^(\d{2})(?=\d)/, "$1/");
            void expiry.onChange(event);
          }}
          error={errors.expiry?.message}
          readOnly={processing}
        />
        {processing ? (
          <TextField
            key="cvv-masked"
            id="top-up-cvv"
            label="CVV"
            value="•••"
            readOnly
          />
        ) : (
          <TextField
            key="cvv"
            id="top-up-cvv"
            label="CVV"
            placeholder="3 dígitos"
            inputMode="numeric"
            autoComplete="off"
            {...cvv}
            error={errors.cvv?.message}
          />
        )}
      </div>
      <TextField
        id="top-up-cardholder-name"
        label="Nombre en la tarjeta"
        autoComplete="off"
        {...cardholderName}
        error={errors.cardholderName?.message}
        readOnly={processing}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {processing ? "Cerrar" : "Cancelar"}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={props.submitDisabled}>
          {processing && (
            <LoaderCircle
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {label}
        </Button>
      </div>
      <details>
        <summary>Tarjetas de prueba</summary>
        <p>Todas usan vencimiento 12/26 y CVV 543.</p>
        <ul>
          {ScenarioCard.options.map((number) => (
            <li key={number}>
              {number.replace(/(\d{4})(?=\d)/g, "$1 ")} · {CARD_LABELS[number]}
            </li>
          ))}
        </ul>
      </details>
    </form>
  );
}
