import { Bar, BarChart, Cell, LabelList, XAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { type SnailWins, winsSummary } from "./race-stats.ts";

export function WinsChart({ wins }: { wins: SnailWins[] }) {
  return (
    <>
      <ChartContainer
        config={{ wins: { label: "Victorias" } }}
        role="img"
        aria-labelledby="wins-summary"
        className="mt-3 aspect-auto h-55 w-full"
      >
        <BarChart data={wins} margin={{ top: 24 }} accessibilityLayer={false}>
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
          />
          <Bar
            dataKey="wins"
            stroke="var(--silk-seam)"
            strokeWidth={1.5}
            minPointSize={2}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {wins.map(({ id }) => (
              <Cell key={id} fill={`url(#silk-${id})`} />
            ))}
            <LabelList
              dataKey="wins"
              position="top"
              offset={8}
              className="fill-foreground font-extrabold"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p id="wins-summary" className="mt-2 text-sm text-muted-foreground">
        {winsSummary(wins)}
      </p>
    </>
  );
}
