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

export function TopUpForm(props: {
  defaultName: string;
  processing: boolean;
  submitDisabled: boolean;
  alert: TopUpAlert | null;
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
          "Couldn't save this top-up. Free up browser storage and try again.",
      });
    }
  });

  const { processing, alert } = props;
  let label = "Top up";
  if (processing) label = "Processing…";
  else if (alert?.tone === "destructive") label = "Try again";
  else if (cents !== null) label = `Top up ${formatMxn(cents)}`;

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="grid gap-4"
    >
      <DialogTitle>Top up your balance</DialogTitle>
      <DialogDescription>
        Paid through SnailPay, a simulated gateway. Use a test card; never a
        real one.
      </DialogDescription>
      {props.server === "waking" ? (
        <Alert role="status">
          <LoaderCircle
            aria-hidden
            className="animate-spin motion-reduce:animate-none"
          />
          <AlertTitle>Waking up the server.</AlertTitle>
          <AlertDescription>This can take up to a minute.</AlertDescription>
        </Alert>
      ) : props.server === "unreachable" ? (
        <>
          <Alert variant="destructive">
            <AlertTitle>Can&apos;t reach the server.</AlertTitle>
            <AlertDescription>Check your connection.</AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={props.onRetryServer}>
            Try again
          </Button>
        </>
      ) : processing ? (
        <Alert role="status">
          <LoaderCircle
            aria-hidden
            className="animate-spin motion-reduce:animate-none"
          />
          <AlertTitle>Processing your payment…</AlertTitle>
          <AlertDescription>
            You can close this window. The result will appear in your top-ups.
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
        label="Amount (MXN)"
        inputMode="decimal"
        placeholder="0.00"
        {...amount}
        error={errors.amount?.message}
        readOnly={processing}
      />
      <TextField
        id="top-up-card-number"
        label="Card number"
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
          label="Expiry"
          placeholder="MM/YY"
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
            placeholder="3 digits"
            inputMode="numeric"
            autoComplete="off"
            {...cvv}
            error={errors.cvv?.message}
          />
        )}
      </div>
      <TextField
        id="top-up-cardholder-name"
        label="Name on card"
        autoComplete="off"
        {...cardholderName}
        error={errors.cardholderName?.message}
        readOnly={processing}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {processing ? "Close" : "Cancel"}
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
    </form>
  );
}
