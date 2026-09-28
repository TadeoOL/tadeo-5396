import { useEffect, useRef, type ReactNode } from "react";

export function ScreenTitle(props: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${props.title} · Snailrace`;
    ref.current?.focus();
  }, [props.title]);
  return (
    <h1 ref={ref} tabIndex={-1} className="outline-none">
      {props.children}
    </h1>
  );
}
