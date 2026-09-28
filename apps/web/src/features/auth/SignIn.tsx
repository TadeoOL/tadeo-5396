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
      <ScreenTitle title="Sign in">Sign in</ScreenTitle>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        See how today's races went and top up your balance.
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
        New here?{" "}
        <Link to="/sign-up" className="font-bold underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
