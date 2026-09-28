import type {
  BetsResponse,
  RaceDayResponse,
  SnailId,
} from "@snailrace/contracts";

export type SnailWins = { id: SnailId; name: string; wins: number };
export type BetTotals = { won: number; lost: number; total: number };

const list = new Intl.ListFormat("es-MX");

export function winsPerSnail(raceDay: RaceDayResponse): SnailWins[] {
  return raceDay.snails.map(({ id, name }) => ({
    id,
    name,
    wins: raceDay.races.filter((race) => race.winnerSnailId === id).length,
  }));
}

export function betTotals(bets: BetsResponse["bets"]): BetTotals {
  const won = bets.filter((bet) => bet.outcome === "won").length;
  return { won, lost: bets.length - won, total: bets.length };
}

export function winsSummary(wins: readonly SnailWins[]): string {
  const winners = wins
    .filter((snail) => snail.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .map(({ name, wins: n }, i) =>
      i === 0
        ? `${name} ganó ${n} ${n === 1 ? "carrera" : "carreras"}`
        : `${name} ${n}`,
    );
  const losers = wins.filter((snail) => snail.wins === 0).map((s) => s.name);
  const first = `${list.format(winners)}.`;
  return losers.length === 0
    ? first
    : `${first} ${list.format(losers)} ${losers.length === 1 ? "no ganó" : "no ganaron"}.`;
}
