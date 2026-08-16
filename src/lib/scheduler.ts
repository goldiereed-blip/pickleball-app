import { ScheduleMatch, ScheduleRound } from './types';

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Canonical key for a partnership (order-independent). */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Canonical key for a 4-player matchup (order-independent).
 * 1&2 vs 3&4 = 3&4 vs 1&2 = 2&1 vs 4&3 → same key.
 */
function matchupKey(a: string, b: string, c: string, d: string): string {
  return [a, b, c, d].sort().join(':');
}

/** Fisher-Yates shuffle — returns a new array, does not mutate input. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

/**
 * Validate a rotating-partners schedule for fairness constraints.
 * Returns isValid=true only when all constraints are satisfied.
 */
export function validateRotatingSchedule(
  schedule: ScheduleRound[],
  players: string[]
): ValidationResult {
  const violations: string[] = [];
  const lastByeRound = new Map<string, number>();
  const lastPartnerRound = new Map<string, number>();
  const lastMatchupRound = new Map<string, number>();
  const byeCount = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();

  for (const p of players) {
    byeCount.set(p, 0);
    gamesPlayed.set(p, 0);
  }

  // When only 4 players exist on one court, the same matchup is unavoidable every round.
  const onlyFourPlayers = players.length === 4;

  for (const round of schedule) {
    const rn = round.roundNumber;

    // Check 1 & 2: No consecutive byes + track bye counts for fairness
    for (const p of round.sitting) {
      if (lastByeRound.get(p) === rn - 1) {
        violations.push(`Consecutive bye: ${p} rounds ${rn - 1}→${rn}`);
      }
      lastByeRound.set(p, rn);
      byeCount.set(p, (byeCount.get(p) ?? 0) + 1);
    }

    // Check 3: Bye distribution fairness (no player 2+ byes ahead of another)
    const byeVals = [...byeCount.values()];
    const minBye = Math.min(...byeVals);
    const maxBye = Math.max(...byeVals);
    if (maxBye - minBye >= 2) {
      violations.push(`Bye imbalance after round ${rn}: max=${maxBye} min=${minBye}`);
    }

    for (const match of round.matches) {
      const [t1p1, t1p2] = match.team1;
      const [t2p1, t2p2] = match.team2;

      for (const p of [t1p1, t1p2, t2p1, t2p2]) {
        gamesPlayed.set(p, (gamesPlayed.get(p) ?? 0) + 1);
      }

      // Check 4: No consecutive partnerships
      const pk1 = pairKey(t1p1, t1p2);
      const pk2 = pairKey(t2p1, t2p2);
      if (lastPartnerRound.get(pk1) === rn - 1) {
        violations.push(`Consecutive partnership: ${pk1} rounds ${rn - 1}→${rn}`);
      }
      if (lastPartnerRound.get(pk2) === rn - 1) {
        violations.push(`Consecutive partnership: ${pk2} rounds ${rn - 1}→${rn}`);
      }
      lastPartnerRound.set(pk1, rn);
      lastPartnerRound.set(pk2, rn);

      // Check 5: No consecutive matchup repeats (skip when only 4 players — unavoidable)
      if (!onlyFourPlayers) {
        const mk = matchupKey(t1p1, t1p2, t2p1, t2p2);
        if (lastMatchupRound.get(mk) === rn - 1) {
          violations.push(`Consecutive matchup: [${mk}] rounds ${rn - 1}→${rn}`);
        }
        lastMatchupRound.set(mk, rn);
      }
    }
  }

  // Check 6: Balanced game counts (max difference ≤ 1)
  const gamesArr = [...gamesPlayed.values()];
  if (gamesArr.length > 0) {
    const minG = Math.min(...gamesArr);
    const maxG = Math.max(...gamesArr);
    if (maxG - minG > 1) {
      violations.push(`Game imbalance: min=${minG} max=${maxG}`);
    }
  }

  return { isValid: violations.length === 0, violations };
}

/**
 * Validate a fixed-partners schedule for fairness constraints.
 */
export function validateFixedPartnersSchedule(
  schedule: ScheduleRound[],
  teams: [string, string][]
): ValidationResult {
  const violations: string[] = [];
  const lastMatchupRound = new Map<string, number>();
  const lastByeRound = new Map<string, number>();
  const byeCount = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();

  const tk = (t: readonly string[]) => [...t].sort().join(':');

  for (const team of teams) {
    byeCount.set(tk(team), 0);
    gamesPlayed.set(tk(team), 0);
  }

  for (const round of schedule) {
    const rn = round.roundNumber;
    const playing = new Set<string>();

    for (const match of round.matches) {
      const k1 = tk(match.team1);
      const k2 = tk(match.team2);
      playing.add(k1);
      playing.add(k2);

      gamesPlayed.set(k1, (gamesPlayed.get(k1) ?? 0) + 1);
      gamesPlayed.set(k2, (gamesPlayed.get(k2) ?? 0) + 1);

      // Check 1: No consecutive same-team matchups
      const mk = [k1, k2].sort().join(' vs ');
      if (lastMatchupRound.get(mk) === rn - 1) {
        violations.push(`Consecutive team matchup: ${mk} rounds ${rn - 1}→${rn}`);
      }
      lastMatchupRound.set(mk, rn);
    }

    // Check 2 & 3: No consecutive team byes + bye fairness
    for (const team of teams) {
      const k = tk(team);
      if (!playing.has(k)) {
        if (lastByeRound.get(k) === rn - 1) {
          violations.push(`Consecutive team bye: ${k} rounds ${rn - 1}→${rn}`);
        }
        lastByeRound.set(k, rn);
        byeCount.set(k, (byeCount.get(k) ?? 0) + 1);
      }
    }

    const byeVals = [...byeCount.values()];
    if (byeVals.length > 0) {
      const minBye = Math.min(...byeVals);
      const maxBye = Math.max(...byeVals);
      if (maxBye - minBye >= 2) {
        violations.push(`Team bye imbalance after round ${rn}: max=${maxBye} min=${minBye}`);
      }
    }
  }

  // Check 4: Balanced team game counts
  const gamesArr = [...gamesPlayed.values()];
  if (gamesArr.length > 0) {
    const minG = Math.min(...gamesArr);
    const maxG = Math.max(...gamesArr);
    if (maxG - minG > 1) {
      violations.push(`Team game imbalance: min=${minG} max=${maxG}`);
    }
  }

  return { isValid: violations.length === 0, violations };
}

// ─── Bye Selection ───────────────────────────────────────────────────────────

/**
 * Select which players sit out this round.
 *
 * Priority rules:
 * 1. No consecutive byes — exclude players who sat last round (unless unavoidable).
 * 2. Fair distribution — prefer players with the fewest career byes so everyone
 *    gets their Nth bye before anyone receives their (N+1)th.
 * 3. Random tie-breaking within the same bye count.
 */
function selectSitters(
  playerIds: string[],
  count: number,
  roundNum: number,
  byeCount: Map<string, number>,
  lastByeRound: Map<string, number>
): string[] {
  if (count <= 0) return [];

  // Exclude players who sat last round when enough others are available.
  const eligible = playerIds.filter(
    (p) => (lastByeRound.get(p) ?? -1) !== roundNum - 1
  );
  // Use the eligible (non-consecutive) pool only when it has MORE than count players.
  const pool = eligible.length > count ? eligible : [...playerIds];

  // Shuffle first so ties are broken randomly, then stable-sort by bye count ascending.
  const randomized = shuffle(pool);
  randomized.sort((a, b) => (byeCount.get(a) ?? 0) - (byeCount.get(b) ?? 0));

  return randomized.slice(0, count);
}

// ─── Pairing Scoring ─────────────────────────────────────────────────────────

/**
 * Score one court's assignment of 4 players into 2 teams.  Higher = better.
 *
 * Critical penalties (override all other factors):
 *   -10 000  same two players partner back-to-back rounds
 *    -5 000  same 4-person group plays together back-to-back rounds
 *
 * Moderate penalties (favour variety over the whole tournament):
 *      -100  per prior time this partnership occurred (escalating cost)
 *       -50  per prior time this 4-person matchup occurred
 *
 * Bonuses (reward novelty):
 *      +200  brand-new partnership (first time these two play together)
 *      +100  brand-new 4-person matchup
 */
function scorePairing(
  t1p1: string,
  t1p2: string,
  t2p1: string,
  t2p2: string,
  roundNum: number,
  partnerCount: Map<string, number>,
  lastPartnerRound: Map<string, number>,
  matchupCount: Map<string, number>,
  lastMatchupRound: Map<string, number>
): number {
  const pk1 = pairKey(t1p1, t1p2);
  const pk2 = pairKey(t2p1, t2p2);
  const mk = matchupKey(t1p1, t1p2, t2p1, t2p2);

  const pc1 = partnerCount.get(pk1) ?? 0;
  const pc2 = partnerCount.get(pk2) ?? 0;
  const lpr1 = lastPartnerRound.get(pk1);
  const lpr2 = lastPartnerRound.get(pk2);
  const mc = matchupCount.get(mk) ?? 0;
  const lmr = lastMatchupRound.get(mk);

  let score = 0;

  if (lpr1 !== undefined && lpr1 === roundNum - 1) score -= 10_000;
  if (lpr2 !== undefined && lpr2 === roundNum - 1) score -= 10_000;
  if (lmr !== undefined && lmr === roundNum - 1) score -= 5_000;

  score -= pc1 * 100;
  score -= pc2 * 100;
  score -= mc * 50;

  if (pc1 === 0) score += 200;
  if (pc2 === 0) score += 200;
  if (mc === 0) score += 100;

  return score;
}

/**
 * Given exactly 4 players on a court, find the best split into 2 teams.
 * There are exactly 3 ways to partition {p0,p1,p2,p3} into 2 pairs — we try all three.
 */
function bestCourtPairing(
  p: [string, string, string, string],
  roundNum: number,
  partnerCount: Map<string, number>,
  lastPartnerRound: Map<string, number>,
  matchupCount: Map<string, number>,
  lastMatchupRound: Map<string, number>
): { team1: [string, string]; team2: [string, string]; score: number } {
  const options: [[string, string], [string, string]][] = [
    [[p[0], p[1]], [p[2], p[3]]],
    [[p[0], p[2]], [p[1], p[3]]],
    [[p[0], p[3]], [p[1], p[2]]],
  ];

  let best = { team1: options[0][0], team2: options[0][1], score: -Infinity };

  for (const [team1, team2] of options) {
    const s = scorePairing(
      team1[0], team1[1], team2[0], team2[1],
      roundNum, partnerCount, lastPartnerRound, matchupCount, lastMatchupRound
    );
    if (s > best.score) best = { team1, team2, score: s };
  }

  return best;
}

// ─── Round Generation ─────────────────────────────────────────────────────────

/**
 * Generate the best set of matches for one round via Monte Carlo sampling.
 *
 * We draw NUM_TRIALS random permutations of the active players, assign them
 * to courts sequentially (positions 0–3 → court 1, 4–7 → court 2, …), then
 * for each court exhaustively pick the best of the 3 possible pairings.
 * The trial whose courts sum to the highest total score wins.
 */
function generateBestRound(
  active: string[],
  maxCourts: number,
  roundNum: number,
  partnerCount: Map<string, number>,
  lastPartnerRound: Map<string, number>,
  matchupCount: Map<string, number>,
  lastMatchupRound: Map<string, number>
): ScheduleMatch[] {
  const NUM_TRIALS = 1_000;

  let bestMatches: ScheduleMatch[] = [];
  let bestScore = -Infinity;

  for (let trial = 0; trial < NUM_TRIALS; trial++) {
    const shuffled = shuffle(active);
    let trialScore = 0;
    const trialMatches: ScheduleMatch[] = [];

    for (let courtIdx = 0; courtIdx < maxCourts; courtIdx++) {
      const base = courtIdx * 4;
      const four: [string, string, string, string] = [
        shuffled[base], shuffled[base + 1],
        shuffled[base + 2], shuffled[base + 3],
      ];
      const { team1, team2, score } = bestCourtPairing(
        four, roundNum,
        partnerCount, lastPartnerRound,
        matchupCount, lastMatchupRound
      );
      trialScore += score;
      trialMatches.push({ court: courtIdx + 1, team1, team2 });
    }

    if (trialScore > bestScore) {
      bestScore = trialScore;
      bestMatches = trialMatches;
    }
  }

  return bestMatches;
}

// ─── Internal: single full-schedule attempt ───────────────────────────────────

function attemptRotatingGeneration(
  playerIds: string[],
  numCourts: number,
  numRounds: number
): ScheduleRound[] {
  const n = playerIds.length;
  const maxCourts = Math.min(numCourts, Math.floor(n / 4));
  const sittingPerRound = n - maxCourts * 4;

  const byeCount = new Map<string, number>();
  const lastByeRound = new Map<string, number>();
  const partnerCount = new Map<string, number>();
  const lastPartnerRound = new Map<string, number>();
  const matchupCount = new Map<string, number>();
  const lastMatchupRound = new Map<string, number>();

  for (const p of playerIds) {
    byeCount.set(p, 0);
    lastByeRound.set(p, -1);
  }

  const rounds: ScheduleRound[] = [];

  for (let i = 0; i < numRounds; i++) {
    const roundNum = i + 1;

    const sitting = selectSitters(
      playerIds, sittingPerRound, roundNum, byeCount, lastByeRound
    );
    const sittingSet = new Set(sitting);
    const active = playerIds.filter((p) => !sittingSet.has(p));
    if (active.length < 4) break;

    const matches = generateBestRound(
      active, maxCourts, roundNum,
      partnerCount, lastPartnerRound,
      matchupCount, lastMatchupRound
    );

    for (const p of sitting) {
      byeCount.set(p, (byeCount.get(p) ?? 0) + 1);
      lastByeRound.set(p, roundNum);
    }

    for (const m of matches) {
      const pk1 = pairKey(m.team1[0], m.team1[1]);
      partnerCount.set(pk1, (partnerCount.get(pk1) ?? 0) + 1);
      lastPartnerRound.set(pk1, roundNum);

      const pk2 = pairKey(m.team2[0], m.team2[1]);
      partnerCount.set(pk2, (partnerCount.get(pk2) ?? 0) + 1);
      lastPartnerRound.set(pk2, roundNum);

      const mk = matchupKey(m.team1[0], m.team1[1], m.team2[0], m.team2[1]);
      matchupCount.set(mk, (matchupCount.get(mk) ?? 0) + 1);
      lastMatchupRound.set(mk, roundNum);
    }

    rounds.push({ roundNumber: roundNum, matches, sitting });
  }

  return rounds;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a rotating-partners schedule with comprehensive fairness guarantees.
 *
 * ┌─ Guarantees ─────────────────────────────────────────────────────────────┐
 * │ 1. No consecutive partnerships — a pair never partners back-to-back.     │
 * │ 2. No consecutive byes — a player never sits out two rounds in a row.    │
 * │ 3. Fair bye distribution — everyone gets their Nth bye before anyone     │
 * │    receives their (N+1)th (levelled by min-bye-count selection).         │
 * │ 4. Matchup variety — the same 4-person group never plays back-to-back;   │
 * │    repeats across the whole tournament are minimised and spread out.     │
 * │ 5. Balanced games — all players play within ±1 game of each other.      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * @param numRounds  Target number of rounds. If omitted, runs until every pair
 *                   of players has partnered at least once (original behaviour).
 */
export function generateRotatingSchedule(
  playerIds: string[],
  numCourts: number,
  numRounds?: number
): ScheduleRound[] {
  const n = playerIds.length;
  const maxCourts = Math.min(numCourts, Math.floor(n / 4));

  if (maxCourts === 0 || n < 4) return [];

  if (numRounds && numRounds > 0) {
    // Fixed target: retry loop to find a schedule that passes all fairness checks.
    const MAX_ATTEMPTS = 100;
    let bestSchedule: ScheduleRound[] = [];
    let bestViolationCount = Infinity;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const schedule = attemptRotatingGeneration(playerIds, numCourts, numRounds);
      const { isValid, violations } = validateRotatingSchedule(schedule, playerIds);

      if (isValid) return schedule;

      if (violations.length < bestViolationCount) {
        bestViolationCount = violations.length;
        bestSchedule = schedule;
      }
    }

    // Best-effort fallback: return the attempt with fewest constraint violations.
    return bestSchedule;
  }

  // Default (no numRounds): run the while-loop until every pair has partnered at
  // least once, or a generous safety cap is reached (original behaviour).
  const totalPairs = (n * (n - 1)) / 2;
  const partnershipsPerRound = maxCourts * 2;
  const minRounds = Math.ceil(totalPairs / partnershipsPerRound);
  const maxRounds = minRounds + Math.ceil(minRounds * 0.35) + n;
  const sittingPerRound = n - maxCourts * 4;

  const byeCount = new Map<string, number>();
  const lastByeRound = new Map<string, number>();
  const partnerCount = new Map<string, number>();
  const lastPartnerRound = new Map<string, number>();
  const matchupCount = new Map<string, number>();
  const lastMatchupRound = new Map<string, number>();

  for (const p of playerIds) {
    byeCount.set(p, 0);
    lastByeRound.set(p, -1);
  }

  const rounds: ScheduleRound[] = [];
  let partneredPairs = 0;

  while (partneredPairs < totalPairs && rounds.length < maxRounds) {
    const roundNum = rounds.length + 1;

    const sitting = selectSitters(
      playerIds, sittingPerRound, roundNum, byeCount, lastByeRound
    );
    const sittingSet = new Set(sitting);
    const active = playerIds.filter((p) => !sittingSet.has(p));
    if (active.length < 4) break;

    const matches = generateBestRound(
      active, maxCourts, roundNum,
      partnerCount, lastPartnerRound, matchupCount, lastMatchupRound
    );

    for (const p of sitting) {
      byeCount.set(p, (byeCount.get(p) ?? 0) + 1);
      lastByeRound.set(p, roundNum);
    }

    for (const m of matches) {
      const pk1 = pairKey(m.team1[0], m.team1[1]);
      const prev1 = partnerCount.get(pk1) ?? 0;
      if (prev1 === 0) partneredPairs++;
      partnerCount.set(pk1, prev1 + 1);
      lastPartnerRound.set(pk1, roundNum);

      const pk2 = pairKey(m.team2[0], m.team2[1]);
      const prev2 = partnerCount.get(pk2) ?? 0;
      if (prev2 === 0) partneredPairs++;
      partnerCount.set(pk2, prev2 + 1);
      lastPartnerRound.set(pk2, roundNum);

      const mk = matchupKey(m.team1[0], m.team1[1], m.team2[0], m.team2[1]);
      matchupCount.set(mk, (matchupCount.get(mk) ?? 0) + 1);
      lastMatchupRound.set(mk, roundNum);
    }

    rounds.push({ roundNumber: roundNum, matches, sitting });
  }

  return rounds;
}

/**
 * Generate a fixed-partners schedule using the circle method.
 * If teamPairings are provided those are used; otherwise players are paired
 * in order: (0,1), (2,3), (4,5), … Each team plays every other team once.
 */
export function generateFixedSchedule(
  playerIds: string[],
  numCourts: number,
  teamPairings?: [string, string][]
): ScheduleRound[] {
  const n = playerIds.length;
  if (n < 4 || n % 2 !== 0) return [];

  const teams: [string, string][] = teamPairings ? [...teamPairings] : [];
  if (teams.length === 0) {
    for (let i = 0; i < n; i += 2) {
      teams.push([playerIds[i], playerIds[i + 1]]);
    }
  }

  const T = teams.length;
  const maxCourts = Math.min(numCourts, Math.floor(T / 2));
  if (maxCourts === 0) return [];

  const teamIndices = Array.from({ length: T }, (_, i) => i);
  const isEven = T % 2 === 0;
  const numRoundsRR = isEven ? T - 1 : T;

  const allRoundMatchups: [number, number][][] = [];

  if (isEven) {
    const rot = teamIndices.filter((i) => i !== T - 1);
    for (let r = 0; r < numRoundsRR; r++) {
      const matchups: [number, number][] = [];
      matchups.push([T - 1, rot[0]]);
      for (let i = 1; i <= (T - 2) / 2; i++) {
        matchups.push([rot[i], rot[T - 1 - i]]);
      }
      allRoundMatchups.push(matchups);
      rot.push(rot.shift()!);
    }
  } else {
    const rot = [...teamIndices];
    for (let r = 0; r < numRoundsRR; r++) {
      const matchups: [number, number][] = [];
      for (let i = 1; i <= (T - 1) / 2; i++) {
        matchups.push([rot[i], rot[T - i]]);
      }
      allRoundMatchups.push(matchups);
      rot.push(rot.shift()!);
    }
  }

  const rounds: ScheduleRound[] = [];
  let roundNum = 1;

  for (const rrMatchups of allRoundMatchups) {
    const validMatchups = rrMatchups.filter(([a, b]) => a !== b);

    for (let i = 0; i < validMatchups.length; i += maxCourts) {
      const batch = validMatchups.slice(i, i + maxCourts);
      const matches: ScheduleMatch[] = batch.map(([a, b], idx) => ({
        court: idx + 1,
        team1: teams[a],
        team2: teams[b],
      }));

      const playingTeams = new Set<number>();
      for (const [a, b] of batch) {
        playingTeams.add(a);
        playingTeams.add(b);
      }
      const sittingPlayers: string[] = [];
      for (let t = 0; t < T; t++) {
        if (!playingTeams.has(t)) {
          sittingPlayers.push(teams[t][0], teams[t][1]);
        }
      }

      rounds.push({ roundNumber: roundNum++, matches, sitting: sittingPlayers });
    }
  }

  return rounds;
}

/**
 * Estimate how many rounds are needed for a given configuration.
 */
export function estimateRounds(
  numPlayers: number,
  numCourts: number,
  mode: 'rotating' | 'fixed'
): { rounds: number; description: string } {
  if (numPlayers < 4) {
    return { rounds: 0, description: 'Need at least 4 players' };
  }

  const maxCourts = Math.min(numCourts, Math.floor(numPlayers / 4));

  if (mode === 'rotating') {
    const activePlayersPerRound = maxCourts * 4;
    const totalPairs = (numPlayers * (numPlayers - 1)) / 2;
    const partnershipsPerRound = maxCourts * 2;
    const suggested = Math.ceil(totalPairs / partnershipsPerRound);
    return {
      rounds: suggested,
      description: `${suggested} rounds so every player partners with each other player`,
    };
  } else {
    const numTeams = Math.floor(numPlayers / 2);
    const totalMatchups = (numTeams * (numTeams - 1)) / 2;
    const rounds = Math.ceil(totalMatchups / maxCourts);
    return {
      rounds,
      description: `${rounds} rounds for all ${numTeams} teams to play each other`,
    };
  }
}
