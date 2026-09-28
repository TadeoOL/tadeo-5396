import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/FormAlert";
import { TextField } from "@/components/TextField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SignInResult } from "./auth";
import { signInSchema, type SignInInput, type SignInValues } from "./schemas";

export function SignInForm(props: {
  sessionExpired: boolean;
  onSubmit: (values: SignInValues) => Promise<SignInResult>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput, unknown, SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const submit = handleSubmit(async (values) => {
    const result = await props.onSubmit(values);
    if (result.status === "invalid") {
      resetField("password");
      setError("root", { type: "invalid" });
    } else if (result.status === "locked") {
      setLockedUntil(result.lockedUntil);
      setNow(() => Date.now());
    }
  });

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (Date.parse(lockedUntil) <= current) setLockedUntil(null);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const seconds = lockedUntil
    ? Math.ceil((Date.parse(lockedUntil) - now) / 1000)
    : 0;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => void submit(event)}
    >
      {seconds > 0 ? (
        <FormAlert variant="destructive">
          <Clock aria-hidden />
          <AlertTitle>Demasiados intentos.</AlertTitle>
          <AlertDescription>Intenta de nuevo en {seconds} s.</AlertDescription>
        </FormAlert>
      ) : errors.root?.type === "invalid" ? (
        <FormAlert variant="destructive">
          <X aria-hidden />
          <AlertTitle>Correo electrónico o contraseña incorrectos.</AlertTitle>
        </FormAlert>
      ) : (
        props.sessionExpired && (
          <Alert role="status">
            <AlertTitle>Tu sesión expiró.</AlertTitle>
            <AlertDescription>
              Inicia sesión de nuevo para continuar.
            </AlertDescription>
          </Alert>
        )
      )}
      <TextField
        id="sign-in-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={errors.email?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-in-password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        {...register("password")}
        error={errors.password?.message}
        readOnly={isSubmitting}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || seconds > 0}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
            Iniciando sesión…
          </>
        ) : (
          "Iniciar sesión"
        )}
      </Button>
    </form>
  );
}
