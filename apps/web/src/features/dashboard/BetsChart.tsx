import { Pie, PieChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import type { BetTotals } from "./race-stats.ts";

export function BetsChart({ totals }: { totals: BetTotals }) {
  const { won, lost, total } = totals;
  return (
    <>
      <div
        role="img"
        aria-labelledby="bets-summary"
        className="relative mx-auto mt-3 size-40"
      >
        <ChartContainer
          config={{ won: { label: "Ganadas" }, lost: { label: "Perdidas" } }}
          className="aspect-square size-40"
        >
          <PieChart accessibilityLayer={false}>
            <Pie
              data={[
                { outcome: "won", count: won, fill: "var(--bet-won)" },
                { outcome: "lost", count: lost, fill: "url(#bet-hatch)" },
              ]}
              dataKey="count"
              nameKey="outcome"
              innerRadius={46}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black">
            {won}/{total}
          </span>
          <span className="text-sm">ganadas</span>
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <span aria-hidden="true">
          ■ {won} ganadas · ▨ {lost} perdidas, de {total} apuestas.
        </span>
        <span id="bets-summary" className="sr-only">
          {won} ganadas, {lost} perdidas, de {total} apuestas.
        </span>
      </p>
    </>
  );
}
