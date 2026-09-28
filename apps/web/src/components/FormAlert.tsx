import { useEffect, useRef, type ComponentProps } from "react";
import { Alert } from "@/components/ui/alert";

export function FormAlert(props: ComponentProps<typeof Alert>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <Alert ref={ref} tabIndex={-1} {...props} />;
}
