import { Link } from "react-router";
import { AuthLayout } from "@/app/AuthLayout";
import { ScreenTitle } from "@/app/ScreenTitle";

export function SignIn() {
  return (
    <AuthLayout>
      <ScreenTitle title="Sign in">Sign in</ScreenTitle>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        See how today's races went and top up your balance.
      </p>
      <p className="mt-4 text-center text-sm">
        New here?{" "}
        <Link to="/sign-up" className="font-bold underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
