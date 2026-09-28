import { SnailId } from "@snailrace/contracts";

export function SilkPatterns() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <pattern
          id="silk-comet"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="16" height="16" fill="var(--chart-1)" />
          <rect y="5" width="16" height="6" fill="var(--chart-1-trim)" />
        </pattern>
        <pattern
          id="silk-mossback"
          width="16"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="16" height="12" fill="var(--chart-2)" />
          <path
            d="M0 11 L8 4 L16 11"
            fill="none"
            stroke="var(--chart-2-trim)"
            strokeWidth="3"
          />
        </pattern>
        <pattern
          id="silk-pepper"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <rect width="24" height="24" fill="var(--chart-3)" />
          <rect width="12" height="12" fill="var(--chart-3-trim)" />
          <rect
            x="12"
            y="12"
            width="12"
            height="12"
            fill="var(--chart-3-trim)"
          />
        </pattern>
        <pattern
          id="silk-drizzle"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="12" height="12" fill="var(--chart-4)" />
          <circle cx="6" cy="6" r="2.6" fill="var(--chart-4-trim)" />
        </pattern>
        <pattern
          id="silk-nacho"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="14" height="14" fill="var(--chart-5)" />
          <rect width="5" height="14" fill="var(--chart-5-trim)" />
        </pattern>
        <pattern
          id="silk-sprinkles"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="12" height="12" fill="var(--chart-6)" />
          <rect x="4" width="4" height="12" fill="var(--chart-6-trim)" />
        </pattern>
        <pattern
          id="bet-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="var(--background)" />
          <rect width="3" height="6" fill="var(--bet-lost)" />
        </pattern>
      </defs>
    </svg>
  );
}

export function SilkSwatch(props: { snail: SnailId; className?: string }) {
  return (
    <svg viewBox="0 0 40 36" aria-hidden="true" className={props.className}>
      <path
        d="M13 2 L5 6 L1 16 L8 19 L9 14 L9 34 L31 34 L31 14 L32 19 L39 16 L35 6 L27 2 Q20 8 13 2 Z"
        fill={`url(#silk-${props.snail})`}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function SilksRow() {
  return (
    <div aria-hidden="true" className="mb-4 flex gap-2">
      {SnailId.options.map((id) => (
        <SilkSwatch key={id} snail={id} className="h-[22px] w-6" />
      ))}
    </div>
  );
}
