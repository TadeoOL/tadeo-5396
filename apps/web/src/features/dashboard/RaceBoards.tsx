import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { betsQuery, raceDayQuery } from "@/api/race-days";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { localIsoDate } from "@/lib/date";
import { BetsChart } from "./BetsChart.tsx";
import { betTotals, winsPerSnail } from "./race-stats.ts";
import { WinsChart } from "./WinsChart.tsx";

export function RaceBoards({ userId }: { userId: string }) {
  const [date] = useState(() => localIsoDate(new Date()));
  const raceDay = useQuery(raceDayQuery(date));
  const bets = useQuery(betsQuery(date, userId));
  return (
    <div className="grid border-b-[1.5px] border-dashed md:grid-cols-3">
      <section
        aria-labelledby="wins-heading"
        className="px-4 py-6 md:col-span-2 md:px-6"
      >
        <h3 id="wins-heading">Wins today</h3>
        <p className="text-sm text-muted-foreground">6 races, 6 snails</p>
        {raceDay.isPending ? (
          <Skeleton className="mt-3 h-45 w-full" />
        ) : raceDay.isError ? (
          <ChartError
            title="Couldn't load today's races."
            retrying={raceDay.isFetching}
            onRetry={() => void raceDay.refetch()}
          />
        ) : (
          <WinsChart wins={winsPerSnail(raceDay.data)} />
        )}
      </section>
      <section
        aria-labelledby="bets-heading"
        className="border-t-[1.5px] border-dashed px-4 py-6 md:border-t-0 md:border-l-[1.5px] md:px-6"
      >
        <h3 id="bets-heading">Your bets today</h3>
        <p className="text-sm text-muted-foreground">
          Simulated, no money involved
        </p>
        {bets.isPending ? (
          <Skeleton className="mx-auto mt-3 size-35 rounded-full" />
        ) : bets.isError ? (
          <ChartError
            title="Couldn't load your bets."
            retrying={bets.isFetching}
            onRetry={() => void bets.refetch()}
          />
        ) : (
          <BetsChart totals={betTotals(bets.data.bets)} />
        )}
      </section>
    </div>
  );
}

function ChartError(props: {
  title: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive" className="mt-3">
      <TriangleAlert />
      <AlertTitle>{props.title}</AlertTitle>
      <AlertDescription>
        Check your connection and try again.
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={props.retrying}
          onClick={props.onRetry}
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
