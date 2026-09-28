import type { RaceDayResponse, SnailId } from "@snailrace/contracts";
import { describe, expect, it } from "vitest";
import { betTotals, winsPerSnail, winsSummary } from "./race-stats.ts";

const snails: RaceDayResponse["snails"] = [
  { id: "comet", name: "Comet" },
  { id: "mossback", name: "Mossback" },
  { id: "pepper", name: "Pepper" },
  { id: "drizzle", name: "Drizzle" },
  { id: "nacho", name: "Nacho" },
  { id: "sprinkles", name: "Sprinkles" },
];

function raceDay(winners: SnailId[]): RaceDayResponse {
  return {
    date: "2026-09-28",
    snails,
    races: winners.map((winnerSnailId, i) => ({
      number: i + 1,
      winnerSnailId,
    })),
  };
}

const summary = (winners: SnailId[]) =>
  winsSummary(winsPerSnail(raceDay(winners)));

describe("race stats", () => {
  it("counts Wins per Snail in Snail order, including Snails with no Wins", () => {
    expect(
      winsPerSnail(
        raceDay(["pepper", "comet", "pepper", "mossback", "pepper", "comet"]),
      ),
    ).toEqual([
      { id: "comet", name: "Comet", wins: 2 },
      { id: "mossback", name: "Mossback", wins: 1 },
      { id: "pepper", name: "Pepper", wins: 3 },
      { id: "drizzle", name: "Drizzle", wins: 0 },
      { id: "nacho", name: "Nacho", wins: 0 },
      { id: "sprinkles", name: "Sprinkles", wins: 0 },
    ]);
  });

  it("counts won and lost Bets", () => {
    const bets = [
      ...Array.from({ length: 7 }, () => "won" as const),
      ...Array.from({ length: 5 }, () => "lost" as const),
    ].map((outcome) => ({ raceNumber: 1, snailId: "comet" as const, outcome }));
    expect(betTotals(bets)).toEqual({ won: 7, lost: 5, total: 12 });
  });

  it("summarizes the Wins, most Wins first", () => {
    expect(
      summary(["pepper", "comet", "pepper", "mossback", "pepper", "comet"]),
    ).toBe(
      "Pepper won 3 races, Comet 2, and Mossback 1. Drizzle, Nacho, and Sprinkles did not win.",
    );
  });

  it("breaks ties in Snail order", () => {
    expect(
      summary(["nacho", "pepper", "pepper", "comet", "comet", "nacho"]),
    ).toBe(
      "Comet won 2 races, Pepper 2, and Nacho 2. Mossback, Drizzle, and Sprinkles did not win.",
    );
  });

  it("says race for a single Win and drops the second sentence when every Snail won", () => {
    expect(
      summary(["sprinkles", "comet", "nacho", "drizzle", "pepper", "mossback"]),
    ).toBe(
      "Comet won 1 race, Mossback 1, Pepper 1, Drizzle 1, Nacho 1, and Sprinkles 1.",
    );
  });

  it("handles one winner, two winners and a single Snail without a Win", () => {
    expect(summary(Array.from({ length: 6 }, () => "nacho" as const))).toBe(
      "Nacho won 6 races. Comet, Mossback, Pepper, Drizzle, and Sprinkles did not win.",
    );
    expect(
      summary(["comet", "comet", "drizzle", "comet", "comet", "comet"]),
    ).toBe(
      "Comet won 5 races and Drizzle 1. Mossback, Pepper, Nacho, and Sprinkles did not win.",
    );
    expect(
      summary(["comet", "mossback", "pepper", "drizzle", "nacho", "comet"]),
    ).toBe(
      "Comet won 2 races, Mossback 1, Pepper 1, Drizzle 1, and Nacho 1. Sprinkles did not win.",
    );
  });
});
