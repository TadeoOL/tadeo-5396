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
          <AlertTitle>An account with this email already exists.</AlertTitle>
          <AlertDescription>
            <Link to="/sign-in">Sign in instead</Link>
          </AlertDescription>
        </FormAlert>
      )}
      {rootType === "storage-failed" && (
        <FormAlert variant="destructive">
          <AlertTitle>
            Couldn't save your account. Free up browser storage and try again.
          </AlertTitle>
        </FormAlert>
      )}
      <TextField
        id="sign-up-full-name"
        label="Full name"
        type="text"
        autoComplete="name"
        {...register("fullName")}
        error={errors.fullName?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-up-email"
        label="Email"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={errors.email?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-up-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 15 characters. A short phrase works well."
        {...register("password")}
        error={errors.password?.message}
        readOnly={isSubmitting}
      />
      <TextField
        id="sign-up-confirm-password"
        label="Confirm password"
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
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
