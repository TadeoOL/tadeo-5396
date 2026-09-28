import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { FormAlert } from "@/components/FormAlert";
import { TextField } from "@/components/TextField";
import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signUpSchema, type SignUpInput, type SignUpValues } from "./schemas";

export type SignUpProblem = "duplicate-email" | "storage-failed";

export function SignUpForm(props: {
  onSubmit: (values: SignUpValues) => Promise<SignUpProblem | null>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const submit = handleSubmit(async (values) => {
    const problem = await props.onSubmit(values);
    if (problem) setError("root", { type: problem });
  });
  const rootType = errors.root?.type;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => void submit(event)}
    >
      {rootType === "duplicate-email" && (
        <FormAlert variant="destructive">
          <AlertTitle>
            Ya existe una cuenta con este correo electrónico.
          </AlertTitle>
          <AlertDescription>
            <Link to="/sign-in">Inicia sesión con esa cuenta</Link>
          </AlertDescription>
        </FormAlert>
      )}
      {rootType === "storage-failed" && (
        <FormAlert variant="destructive">
          <AlertTitle>
            No se pudo guardar tu cuenta. Libera espacio de almacenamiento del
            navegador e intenta de nuevo.
          </AlertTitle>
        </FormAlert>
      )}
      <TextField
        id="sign-up-full-name"
        label="Nombre completo"
        type="text"
        autoComplete="name"
        {...register("fullName")}
        error={errors.fullName?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-up-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={errors.email?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-up-password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Al menos 15 caracteres. Una frase corta funciona bien."
        {...register("password")}
        error={errors.password?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-up-confirm-password"
        label="Confirma la contraseña"
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
        readOnly={isSubmitting}
      />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
            Creando cuenta…
          </>
        ) : (
          "Crear cuenta"
        )}
      </Button>
    </form>
  );
}
