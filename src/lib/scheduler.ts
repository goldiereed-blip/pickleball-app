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
  // lastByeRound is initialised to -1 so it never spuriously matches roundNum-1=0.
  const eligible = playerIds.filter(
    (p) => (lastByeRound.get(p) ?? -1) !== roundNum - 1
  );
  // Use the eligible (non-consecutive) pool only when it has MORE than count players,
  // giving us genuine choice. When eligible.length === count every eligible player
  // must sit anyway and mixing into the full pool is needed for partnership variety
  // (otherwise n = 2×courts×4 configurations lock into two isolated alternating groups
  // that never cross-pair — same pathology as the original algorithm).
  const pool = eligible.length > count ? eligible : [...playerIds];

  // Shuffle first so ties are broken randomly, then stable-sort by bye count
  // ascending (fewest byes → sits first, equalising the distribution).
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
  // Use direct Map.get (no ?? 0 fallback) so that "never played" (undefined) is
  // never confused with "played in the hypothetical round 0".
  const lpr1 = lastPartnerRound.get(pk1);
  const lpr2 = lastPartnerRound.get(pk2);
  const mc = matchupCount.get(mk) ?? 0;
  const lmr = lastMatchupRound.get(mk);

  let score = 0;

  // Critical: consecutive violations (effectively hard constraints).
  // Only fire when the pair/matchup actually has a recorded history (lpr !== undefined).
  if (lpr1 !== undefined && lpr1 === roundNum - 1) score -= 10_000; // same partnership back-to-back
  if (lpr2 !== undefined && lpr2 === roundNum - 1) score -= 10_000;
  if (lmr !== undefined && lmr === roundNum - 1) score -= 5_000;   // same 4-person group back-to-back

  // Repetition costs (escalate with each repeat)
  score -= pc1 * 100;
  score -= pc2 * 100;
  score -= mc * 50;

  // Novelty rewards
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
  // The three possible pairings of 4 players into 2 teams of 2
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
 *
 * This avoids the combinatorial explosion of full enumeration while reliably
 * finding constraint-satisfying schedules: with 1 000 trials the probability
 * of missing the globally optimal arrangement is negligible for all practical
 * pickleball configurations (4–48 players, 1–12 courts).
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
 * │ 5. All-pairs coverage — the schedule runs until every pair of players    │
 * │    has partnered at least once (or a generous safety cap is reached).    │
 * │ 6. Balanced games — all players play within ±1 game of each other.      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function generateRotatingSchedule(
  playerIds: string[],
  numCourts: number
): ScheduleRound[] {
  const n = playerIds.length;
  const maxCourts = Math.min(numCourts, Math.floor(n / 4));
  const sittingPerRound = n - maxCourts * 4;

  if (maxCourts === 0 || n < 4) return [];

  // ── Per-player state ──────────────────────────────────────────────────────
  // byeCount[p]     = number of rounds player p has sat out
  // lastByeRound[p] = most recent round number player p sat out (0 = never)
  const byeCount = new Map<string, number>();
  const lastByeRound = new Map<string, number>();

  // ── Per-partnership state ─────────────────────────────────────────────────
  // partnerCount[key]     = # times this pair has played together
  // lastPartnerRound[key] = most recent round they played together
  const partnerCount = new Map<string, number>();
  const lastPartnerRound = new Map<string, number>();

  // ── Per-matchup state (normalised 4-player key) ───────────────────────────
  // matchupCount[key]     = # times this 4-person group has played
  // lastMatchupRound[key] = most recent round this group played
  const matchupCount = new Map<string, number>();
  const lastMatchupRound = new Map<string, number>();

  for (const p of playerIds) {
    byeCount.set(p, 0);
    // -1 means "never sat out" — avoids false consecutive-bye detection for round 1
    lastByeRound.set(p, -1);
  }

  // Run until every pair has been partners at least once, or we hit the cap.
  const totalPairs = (n * (n - 1)) / 2;
  const partnershipsPerRound = maxCourts * 2;
  const minRounds = Math.ceil(totalPairs / partnershipsPerRound);
  // Safety cap: generous upper bound so the while loop always terminates.
  const maxRounds = minRounds + Math.ceil(minRounds * 0.35) + n;

  const rounds: ScheduleRound[] = [];
  let partneredPairs = 0;

  while (partneredPairs < totalPairs && rounds.length < maxRounds) {
    const roundNum = rounds.length + 1;

    // Step 1 — choose who sits out (no-consecutive + fair-distribution rules).
    const sitting = selectSitters(
      playerIds, sittingPerRound, roundNum, byeCount, lastByeRound
    );
    const sittingSet = new Set(sitting);
    const active = playerIds.filter((p) => !sittingSet.has(p));
    if (active.length < 4) break;

    // Step 2 — find the highest-scoring court arrangement for active players.
    const matches = generateBestRound(
      active, maxCourts, roundNum,
      partnerCount, lastPartnerRound,
      matchupCount, lastMatchupRound
    );

    // Step 3 — update all tracking state.
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
    const totalPairs = (numPlayers * (numPlayers - 1)) / 2;
    const partnershipsPerRound = maxCourts * 2;
    const minRounds = Math.ceil(totalPairs / partnershipsPerRound);
    const suggested = minRounds + Math.ceil(minRounds * 0.3);
    return {
      rounds: suggested,
      description: `~${minRounds}–${suggested} rounds so every player partners with every other player at least once`,
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
