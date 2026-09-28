import type { ReactNode } from "react";

export function AuthLayout(props: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-104 px-4 py-12">{props.children}</div>
  );
}
