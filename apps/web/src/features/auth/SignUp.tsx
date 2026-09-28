import { Link, useNavigate } from "react-router";
import { AuthLayout } from "@/app/AuthLayout";
import { ScreenTitle } from "@/app/ScreenTitle";
import { SilksRow } from "@/components/silks";
import { signUp } from "./auth";
import { SignUpForm } from "./SignUpForm";

export function SignUp() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <SilksRow />
      <ScreenTitle title="Create account">Create your account</ScreenTitle>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Your balance starts at $0.00.
      </p>
      <SignUpForm
        onSubmit={async (values) => {
          try {
            if ((await signUp(values)) === "duplicate-email") {
              return "duplicate-email";
            }
          } catch {
            return "storage-failed";
          }
          void navigate("/dashboard", { replace: true });
          return null;
        }}
      />
      <p className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-bold underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
