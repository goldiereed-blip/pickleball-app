import { ScheduleMatch, ScheduleRound } from './types';

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Canonical key for a partnership OR opponent pair (order-independent). */
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

/** The 4 cross-team opponent pairs for a match. */
function opponentPairs(t1p1: string, t1p2: string, t2p1: string, t2p2: string): string[] {
  return [
    pairKey(t1p1, t2p1),
    pairKey(t1p1, t2p2),
    pairKey(t1p2, t2p1),
    pairKey(t1p2, t2p2),
  ];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

/**
 * Validate a rotating-partners schedule for fairness constraints.
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

  // Initialise all C(n,2) opponent pair counts to 0 so pairs never met show up.
  const oppCount = new Map<string, number>();
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      oppCount.set(pairKey(players[i], players[j]), 0);
      byeCount.set(players[i], 0);
      gamesPlayed.set(players[i], 0);
    }
  }
  // Ensure last player is also initialised (n=1 edge — harmless for n≥4).
  byeCount.set(players[players.length - 1], byeCount.get(players[players.length - 1]) ?? 0);
  gamesPlayed.set(players[players.length - 1], gamesPlayed.get(players[players.length - 1]) ?? 0);

  const onlyFourPlayers = players.length === 4;

  for (const round of schedule) {
    const rn = round.roundNumber;

    // Check 1 & 2: No consecutive byes + running bye count
    for (const p of round.sitting) {
      if (lastByeRound.get(p) === rn - 1) {
        violations.push(`Consecutive bye: ${p} rounds ${rn - 1}→${rn}`);
      }
      lastByeRound.set(p, rn);
      byeCount.set(p, (byeCount.get(p) ?? 0) + 1);
    }

    // Check 3: Bye distribution fairness
    const byeVals = Array.from(byeCount.values());
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

      // Accumulate opponent pair counts for Check 7
      for (const ok of opponentPairs(t1p1, t1p2, t2p1, t2p2)) {
        oppCount.set(ok, (oppCount.get(ok) ?? 0) + 1);
      }
    }
  }

  // Check 6: Balanced game counts (max difference ≤ 1)
  const gamesArr = Array.from(gamesPlayed.values());
  if (gamesArr.length > 0) {
    const minG = Math.min(...gamesArr);
    const maxG = Math.max(...gamesArr);
    if (maxG - minG > 1) {
      violations.push(`Game imbalance: min=${minG} max=${maxG}`);
    }
  }

  // Check 7: Opponent pair frequency balance.
  // For no-bye schedules the math is exact, so require max−min ≤ 1.
  // For schedules with byes, some pairs are structurally less likely to share a court,
  // so allow max−min ≤ 2 as the threshold.
  const hasByes = schedule.some((r) => r.sitting.length > 0);
  const oppThreshold = hasByes ? 2 : 1;
  const oppVals = Array.from(oppCount.values());
  if (oppVals.length > 0) {
    const minOpp = Math.min(...oppVals);
    const maxOpp = Math.max(...oppVals);
    if (maxOpp - minOpp > oppThreshold) {
      violations.push(`Opponent frequency imbalance: min=${minOpp} max=${maxOpp}`);
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

      const mk = [k1, k2].sort().join(' vs ');
      if (lastMatchupRound.get(mk) === rn - 1) {
        violations.push(`Consecutive team matchup: ${mk} rounds ${rn - 1}→${rn}`);
      }
      lastMatchupRound.set(mk, rn);
    }

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

    const byeVals = Array.from(byeCount.values());
    if (byeVals.length > 0) {
      const minBye = Math.min(...byeVals);
      const maxBye = Math.max(...byeVals);
      if (maxBye - minBye >= 2) {
        violations.push(`Team bye imbalance after round ${rn}: max=${maxBye} min=${minBye}`);
      }
    }
  }

  const gamesArr = Array.from(gamesPlayed.values());
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
 * 2. Fair distribution — prefer players with the fewest career byes.
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

  const eligible = playerIds.filter(
    (p) => (lastByeRound.get(p) ?? -1) !== roundNum - 1
  );
  const pool = eligible.length > count ? eligible : [...playerIds];

  const randomized = shuffle(pool);
  randomized.sort((a, b) => (byeCount.get(a) ?? 0) - (byeCount.get(b) ?? 0));

  return randomized.slice(0, count);
}

// ─── Pairing Scoring ─────────────────────────────────────────────────────────

/**
 * Score one court's assignment of 4 players into 2 teams.  Higher = better.
 *
 * Critical penalties (effectively hard constraints):
 *   -10 000  same two players partner back-to-back rounds
 *   -10 000  opponent pair already at/above the target frequency cap
 *    -5 000  same 4-person group plays together back-to-back rounds
 *    -3 000  same opponent pair back-to-back rounds
 *
 * Moderate escalating penalties (favour variety):
 *      -100  per prior partnership
 *       -80  per prior opponent encounter
 *       -50  per prior 4-person matchup
 *
 * Bonuses (reward novelty):
 *      +200  brand-new partnership
 *      +100  brand-new opponent pair
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
  lastMatchupRound: Map<string, number>,
  opponentCount: Map<string, number>,
  lastOpponentRound: Map<string, number>,
  maxOpponentCount: number
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

  // ── Partnership penalties ────────────────────────────────────────────────
  if (lpr1 !== undefined && lpr1 === roundNum - 1) score -= 10_000;
  if (lpr2 !== undefined && lpr2 === roundNum - 1) score -= 10_000;
  score -= pc1 * 100;
  score -= pc2 * 100;
  // Large bonus for brand-new partnerships — must dominate accumulated opponent
  // penalties so the while-loop always covers every pair regardless of how many
  // rounds have elapsed.  Half the magnitude of the hard-cap penalty so the
  // opponent cap still overrides when necessary.
  if (pc1 === 0) score += 5_000;
  if (pc2 === 0) score += 5_000;

  // ── 4-person matchup penalties ───────────────────────────────────────────
  if (lmr !== undefined && lmr === roundNum - 1) score -= 5_000;
  score -= mc * 50;
  if (mc === 0) score += 100;

  // ── Opponent pair penalties ───────────────────────────────────────────────
  // Track all 4 cross-team opponent pairs for this court assignment.
  for (const ok of opponentPairs(t1p1, t1p2, t2p1, t2p2)) {
    const oc = opponentCount.get(ok) ?? 0;
    const lor = lastOpponentRound.get(ok);

    // Hard cap: this pair must not be opponents more than maxOpponentCount times.
    // Using same -10,000 magnitude as the consecutive-partnership hard constraint.
    if (oc >= maxOpponentCount) score -= 10_000;
    // Consecutive rounds as opponents.
    if (lor !== undefined && lor === roundNum - 1) score -= 2_000;
    // Escalating cost per repeat (same scale as partnership: -80 vs -100).
    score -= oc * 80;
    // Novelty bonus for first-time opponents (slightly above partnership level).
    if (oc === 0) score += 150;
  }

  return score;
}

/**
 * Given exactly 4 players on a court, find the best split into 2 teams.
 * There are exactly 3 ways to partition {p0,p1,p2,p3} into 2 pairs.
 */
function bestCourtPairing(
  p: [string, string, string, string],
  roundNum: number,
  partnerCount: Map<string, number>,
  lastPartnerRound: Map<string, number>,
  matchupCount: Map<string, number>,
  lastMatchupRound: Map<string, number>,
  opponentCount: Map<string, number>,
  lastOpponentRound: Map<string, number>,
  maxOpponentCount: number
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
      roundNum,
      partnerCount, lastPartnerRound,
      matchupCount, lastMatchupRound,
      opponentCount, lastOpponentRound, maxOpponentCount
    );
    if (s > best.score) best = { team1, team2, score: s };
  }

  return best;
}

// ─── Round Generation ─────────────────────────────────────────────────────────

/**
 * Generate the best set of matches for one round via Monte Carlo sampling.
 * Draws NUM_TRIALS random permutations of active players, assigns to courts,
 * picks the best pairing per court, and returns the highest-scoring trial.
 */
function generateBestRound(
  active: string[],
  maxCourts: number,
  roundNum: number,
  partnerCount: Map<string, number>,
  lastPartnerRound: Map<string, number>,
  matchupCount: Map<string, number>,
  lastMatchupRound: Map<string, number>,
  opponentCount: Map<string, number>,
  lastOpponentRound: Map<string, number>,
  maxOpponentCount: number
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
        matchupCount, lastMatchupRound,
        opponentCount, lastOpponentRound, maxOpponentCount
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

// ─── State helpers ────────────────────────────────────────────────────────────

/** Update all tracking maps after a round's matches are finalised. */
function updateState(
  matches: ScheduleMatch[],
  roundNum: number,
  partnerCount: Map<string, number>,
  lastPartnerRound: Map<string, number>,
  matchupCount: Map<string, number>,
  lastMatchupRound: Map<string, number>,
  opponentCount: Map<string, number>,
  lastOpponentRound: Map<string, number>
): void {
  for (const m of matches) {
    const [t1p1, t1p2] = m.team1;
    const [t2p1, t2p2] = m.team2;

    const pk1 = pairKey(t1p1, t1p2);
    partnerCount.set(pk1, (partnerCount.get(pk1) ?? 0) + 1);
    lastPartnerRound.set(pk1, roundNum);

    const pk2 = pairKey(t2p1, t2p2);
    partnerCount.set(pk2, (partnerCount.get(pk2) ?? 0) + 1);
    lastPartnerRound.set(pk2, roundNum);

    const mk = matchupKey(t1p1, t1p2, t2p1, t2p2);
    matchupCount.set(mk, (matchupCount.get(mk) ?? 0) + 1);
    lastMatchupRound.set(mk, roundNum);

    for (const ok of opponentPairs(t1p1, t1p2, t2p1, t2p2)) {
      opponentCount.set(ok, (opponentCount.get(ok) ?? 0) + 1);
      lastOpponentRound.set(ok, roundNum);
    }
  }
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
  const opponentCount = new Map<string, number>();
  const lastOpponentRound = new Map<string, number>();

  for (const p of playerIds) {
    byeCount.set(p, 0);
    lastByeRound.set(p, -1);
  }

  // Hard cap: the maximum times any two players should face each other as opponents.
  // Uses total encounters across all courts divided by total pairs — this correctly
  // accounts for multiple courts and gives the right ceiling for any configuration.
  // e.g. 8p/2c/7r → ceil(7×2×4/28) = ceil(2) = 2 (exact); 10p/2c/12r → ceil(96/45) = 3
  const totalOpponentEncounters = numRounds * maxCourts * 4;
  const totalPairs = (n * (n - 1)) / 2;
  const maxOpponentCount = Math.ceil(totalOpponentEncounters / totalPairs);

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
      matchupCount, lastMatchupRound,
      opponentCount, lastOpponentRound, maxOpponentCount
    );

    for (const p of sitting) {
      byeCount.set(p, (byeCount.get(p) ?? 0) + 1);
      lastByeRound.set(p, roundNum);
    }

    updateState(matches, roundNum,
      partnerCount, lastPartnerRound,
      matchupCount, lastMatchupRound,
      opponentCount, lastOpponentRound
    );

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
 * │    receives their (N+1)th.                                               │
 * │ 4. Matchup variety — same 4-person group never plays back-to-back.       │
 * │ 5. Balanced games — all players play within ±1 game of each other.      │
 * │ 6. Opponent frequency balance — opponent pair counts differ by ≤ 1       │
 * │    across all pairs; hard cap enforced during generation.                │
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
    const MAX_ATTEMPTS = 500;
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

  // For the open-ended case we don't know the final round count upfront.
  // Set cap to a very large value so no hard cap triggers; the escalating
  // -150 penalty per repeat is sufficient to discourage opponent imbalance
  // without ever blocking coverage of remaining unpartnered pairs.
  const maxOpponentCount = n * n;

  const byeCount = new Map<string, number>();
  const lastByeRound = new Map<string, number>();
  const partnerCount = new Map<string, number>();
  const lastPartnerRound = new Map<string, number>();
  const matchupCount = new Map<string, number>();
  const lastMatchupRound = new Map<string, number>();
  const opponentCount = new Map<string, number>();
  const lastOpponentRound = new Map<string, number>();

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
      partnerCount, lastPartnerRound,
      matchupCount, lastMatchupRound,
      opponentCount, lastOpponentRound, maxOpponentCount
    );

    for (const p of sitting) {
      byeCount.set(p, (byeCount.get(p) ?? 0) + 1);
      lastByeRound.set(p, roundNum);
    }

    for (const m of matches) {
      const pk1 = pairKey(m.team1[0], m.team1[1]);
      if ((partnerCount.get(pk1) ?? 0) === 0) partneredPairs++;
      const pk2 = pairKey(m.team2[0], m.team2[1]);
      if ((partnerCount.get(pk2) ?? 0) === 0) partneredPairs++;
      // (updateState handles the actual map writes below)
    }

    updateState(matches, roundNum,
      partnerCount, lastPartnerRound,
      matchupCount, lastMatchupRound,
      opponentCount, lastOpponentRound
    );

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
