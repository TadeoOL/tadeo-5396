import { SnailId } from "@snailrace/contracts";
import { describe, expect, it } from "vitest";
import { generateBets, generateRaceDay } from "./generator.ts";

const DATES = Array.from({ length: 50 }, (_, i) =>
  new Date(Date.UTC(2026, 0, 1 + 7 * i)).toISOString().slice(0, 10),
);
const USERS = [
  "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  "3f0c1e2a-5b6d-4e7f-8a9b-0c1d2e3f4a5b",
];

function triples(date: string, userId: string) {
  return generateBets(date, userId).bets.map((b) => [
    b.raceNumber,
    b.snailId,
    b.outcome,
  ]);
}

describe("generator", () => {
  it("every Race Day has six Races numbered 1 to 6, one winner each", () => {
    for (const date of DATES) {
      const { races } = generateRaceDay(date);
      expect(races.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6]);
      const wins = new Map<string, number>();
      for (const r of races) {
        expect(SnailId.options).toContain(r.winnerSnailId);
        wins.set(r.winnerSnailId, (wins.get(r.winnerSnailId) ?? 0) + 1);
      }
      expect([...wins.values()].reduce((a, b) => a + b, 0)).toBe(6);
    }
  });

  it("every User gets 4 to 12 Bets whose outcomes follow the Race winners", () => {
    for (const date of DATES) {
      const { races } = generateRaceDay(date);
      for (const userId of USERS) {
        const { bets } = generateBets(date, userId);
        expect(bets.length).toBeGreaterThanOrEqual(4);
        expect(bets.length).toBeLessThanOrEqual(12);
        for (const bet of bets) {
          const won = races[bet.raceNumber - 1]!.winnerSnailId === bet.snailId;
          expect(bet.outcome).toBe(won ? "won" : "lost");
        }
      }
    }
  });

  it("lists the six Snails in table order", () => {
    expect(generateRaceDay("2026-09-28").snails).toEqual([
      { id: "comet", name: "Comet" },
      { id: "mossback", name: "Mossback" },
      { id: "pepper", name: "Pepper" },
      { id: "drizzle", name: "Drizzle" },
      { id: "nacho", name: "Nacho" },
      { id: "sprinkles", name: "Sprinkles" },
    ]);
  });

  it("is deterministic", () => {
    expect(generateRaceDay("2026-09-28")).toEqual(
      generateRaceDay("2026-09-28"),
    );
    expect(generateBets("2026-09-28", USERS[0]!)).toEqual(
      generateBets("2026-09-28", USERS[0]!),
    );
  });

  it("the hand-worked Race Day for 2026-09-28", () => {
    expect(
      generateRaceDay("2026-09-28").races.map((r) => r.winnerSnailId),
    ).toEqual(["nacho", "pepper", "pepper", "comet", "comet", "nacho"]);
  });

  it("the hand-worked Bets for 2026-09-28", () => {
    expect(triples("2026-09-28", USERS[0]!)).toEqual([
      [1, "mossback", "lost"],
      [3, "comet", "lost"],
      [6, "pepper", "lost"],
      [6, "comet", "lost"],
      [4, "nacho", "lost"],
      [2, "nacho", "lost"],
      [6, "drizzle", "lost"],
      [5, "drizzle", "lost"],
      [2, "nacho", "lost"],
      [5, "comet", "won"],
    ]);
  });

  it("another User gets other Bets over the same Races", () => {
    expect(triples("2026-09-28", USERS[1]!)).toEqual([
      [2, "drizzle", "lost"],
      [1, "drizzle", "lost"],
      [4, "sprinkles", "lost"],
      [2, "drizzle", "lost"],
      [2, "nacho", "lost"],
      [3, "pepper", "won"],
      [4, "comet", "won"],
    ]);
  });
});
