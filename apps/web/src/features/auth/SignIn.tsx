import { Link, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "@/app/AuthLayout";
import { ScreenTitle } from "@/app/ScreenTitle";
import { SilksRow } from "@/components/silks";
import { signIn } from "./auth";
import type { SignInState } from "./guards";
import { SignInForm } from "./SignInForm";

export function SignIn() {
  const state = useLocation().state as SignInState | null;
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <SilksRow />
      <ScreenTitle title="Iniciar sesión">Iniciar sesión</ScreenTitle>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Mira cómo salieron las carreras de hoy y recarga tu saldo.
      </p>
      <SignInForm
        sessionExpired={state?.sessionExpired === true}
        onSubmit={async (values) => {
          const result = await signIn(values);
          if (result.status === "signed-in") {
            void navigate("/dashboard", { replace: true });
          }
          return result;
        }}
      />
      <p className="mt-4 text-center text-sm">
        ¿Primera vez aquí?{" "}
        <Link to="/sign-up" className="font-bold underline">
          Crea una cuenta
        </Link>
      </p>
    </AuthLayout>
  );
}
