import type {
  BetsResponse,
  RaceDayResponse,
  SnailId,
} from "@snailrace/contracts";

const SNAILS: readonly { id: SnailId; name: string }[] = [
  { id: "comet", name: "Comet" },
  { id: "mossback", name: "Mossback" },
  { id: "pepper", name: "Pepper" },
  { id: "drizzle", name: "Drizzle" },
  { id: "nacho", name: "Nacho" },
  { id: "sprinkles", name: "Sprinkles" },
];

// FNV-1a, 32-bit.
function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRaceDay(date: string): RaceDayResponse {
  const next = mulberry32(hashSeed(date));
  const races = [1, 2, 3, 4, 5, 6].map((number) => ({
    number,
    winnerSnailId: SNAILS[Math.floor(next() * 6)]!.id,
  }));
  return { date, snails: [...SNAILS], races };
}

export function generateBets(date: string, userId: string): BetsResponse {
  const { races } = generateRaceDay(date);
  const next = mulberry32(hashSeed(userId + date));
  const count = 4 + Math.floor(next() * 9);
  const bets = Array.from({ length: count }, () => {
    const raceNumber = 1 + Math.floor(next() * 6);
    const snailId = SNAILS[Math.floor(next() * 6)]!.id;
    const won = races[raceNumber - 1]!.winnerSnailId === snailId;
    return {
      raceNumber,
      snailId,
      outcome: won ? ("won" as const) : ("lost" as const),
    };
  });
  return { date, userId, bets };
}
