/**
 * Comprehensive test suite for the round-robin scheduling algorithm.
 * Run with: npx tsx src/lib/test-scheduler.ts
 *
 * Checks validated for rotating-partners mode:
 *   ✓ All-pairs coverage (every pair partners at least once)
 *   ✓ Balanced game counts (max difference ≤ 1)
 *   ✓ No consecutive partnerships (same two partners in back-to-back rounds)
 *   ✓ No consecutive byes (same player sits out in back-to-back rounds)
 *   ✓ Fair bye distribution (everyone gets Nth bye before anyone gets (N+1)th)
 *   ✓ No consecutive matchup repeats (same 4-person group back-to-back)
 */

import { generateRotatingSchedule, generateFixedSchedule, estimateRounds } from './scheduler';
import type { ScheduleRound } from './types';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function matchupKey(a: string, b: string, c: string, d: string): string {
  return [a, b, c, d].sort().join(':');
}

// ─── Fairness validation ───────────────────────────────────────────────────────

interface FairnessReport {
  /** Pairs that partnered in consecutive rounds, e.g. "P1:P2 rounds 3→4". */
  consecutivePartnerships: string[];
  /** Players who sat out in consecutive rounds. */
  consecutiveByes: string[];
  /**
   * Players whose bye count exceeded the minimum by 2+ before others
   * had a chance to catch up (strict levelling violation).
   */
  byeDistributionViolations: string[];
  /** 4-person groups that appeared in consecutive rounds. */
  consecutiveMatchups: string[];
  /** Career bye count per player at end of schedule. */
  byeCounts: Map<string, number>;
  /** Career games played per player. */
  gamesPlayed: Map<string, number>;
  /** How many unique 4-person matchup combinations were used. */
  uniqueMatchups: number;
}

function checkFairness(players: string[], schedule: ScheduleRound[]): FairnessReport {
  const byeCounts = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();
  const lastByeRound = new Map<string, number>();
  const lastPartnerRound = new Map<string, string>(); // pairKey → "roundN"

  for (const p of players) {
    byeCounts.set(p, 0);
    gamesPlayed.set(p, 0);
    // Do NOT initialise lastByeRound — undefined means "never sat out",
    // which correctly avoids false "round 0→1" consecutive-bye violations.
  }

  const consecutivePartnerships: string[] = [];
  const consecutiveByes: string[] = [];
  const consecutiveMatchups: string[] = [];

  // Track matchup (4-player key) → last round number
  const lastMatchupRound = new Map<string, number>();
  const uniqueMatchupsSet = new Set<string>();

  for (const round of schedule) {
    const rn = round.roundNumber;

    // ── Consecutive bye check ─────────────────────────────────────────────
    // lastByeRound is undefined when a player has never sat — undefined !== rn-1
    // so the first round never produces a false violation.
    for (const p of round.sitting) {
      if (lastByeRound.get(p) === rn - 1) {
        consecutiveByes.push(`${p} round ${rn - 1}→${rn}`);
      }
      lastByeRound.set(p, rn);
      byeCounts.set(p, (byeCounts.get(p) ?? 0) + 1);
    }

    // ── Match-level checks ────────────────────────────────────────────────
    for (const match of round.matches) {
      const [t1p1, t1p2] = match.team1;
      const [t2p1, t2p2] = match.team2;

      // Games played
      for (const p of [t1p1, t1p2, t2p1, t2p2]) {
        gamesPlayed.set(p, (gamesPlayed.get(p) ?? 0) + 1);
      }

      // Consecutive partnership check
      const pk1 = pairKey(t1p1, t1p2);
      const pk2 = pairKey(t2p1, t2p2);
      if ((lastPartnerRound.get(pk1) ?? '') === `${rn - 1}`) {
        consecutivePartnerships.push(`${pk1} rounds ${rn - 1}→${rn}`);
      }
      if ((lastPartnerRound.get(pk2) ?? '') === `${rn - 1}`) {
        consecutivePartnerships.push(`${pk2} rounds ${rn - 1}→${rn}`);
      }
      lastPartnerRound.set(pk1, `${rn}`);
      lastPartnerRound.set(pk2, `${rn}`);

      // Consecutive matchup check
      // lastMatchupRound is undefined on first occurrence — undefined !== rn-1 so no false positive.
      const mk = matchupKey(t1p1, t1p2, t2p1, t2p2);
      uniqueMatchupsSet.add(mk);
      if (lastMatchupRound.get(mk) === rn - 1) {
        consecutiveMatchups.push(`[${mk}] rounds ${rn - 1}→${rn}`);
      }
      lastMatchupRound.set(mk, rn);
    }
  }

  // ── Bye distribution check ────────────────────────────────────────────────
  // Simulate the schedule round-by-round tracking per-round bye counts.
  // A violation is: player A gets bye count k+1 while player B still has k-1
  // (i.e., bye counts differ by 2+ at any point — strict levelling violation).
  const byeDistributionViolations: string[] = [];
  const runningBye = new Map<string, number>();
  for (const p of players) runningBye.set(p, 0);

  for (const round of schedule) {
    for (const p of round.sitting) {
      runningBye.set(p, (runningBye.get(p) ?? 0) + 1);
    }
    // After this round, check if any player has 2+ more byes than another
    const counts = Array.from(runningBye.values());
    const minBye = Math.min(...counts);
    const maxBye = Math.max(...counts);
    if (maxBye - minBye >= 2) {
      const offenders = players
        .filter((p) => (runningBye.get(p) ?? 0) === maxBye)
        .join(', ');
      byeDistributionViolations.push(
        `After round ${round.roundNumber}: max bye=${maxBye} min bye=${minBye} (${offenders} ahead)`
      );
    }
  }

  return {
    consecutivePartnerships,
    consecutiveByes,
    byeDistributionViolations,
    consecutiveMatchups,
    byeCounts,
    gamesPlayed,
    uniqueMatchups: uniqueMatchupsSet.size,
  };
}

// ─── Rotating-partners tests ───────────────────────────────────────────────────

function testRotating(numPlayers: number, numCourts: number): boolean {
  const players = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  const schedule = generateRotatingSchedule(players, numCourts);
  const estimate = estimateRounds(numPlayers, numCourts, 'rotating');

  // All-pairs coverage
  const partnerCount = new Map<string, number>();
  for (const round of schedule) {
    for (const match of round.matches) {
      const pk1 = pairKey(match.team1[0], match.team1[1]);
      partnerCount.set(pk1, (partnerCount.get(pk1) ?? 0) + 1);
      const pk2 = pairKey(match.team2[0], match.team2[1]);
      partnerCount.set(pk2, (partnerCount.get(pk2) ?? 0) + 1);
    }
  }

  const totalPairs = (numPlayers * (numPlayers - 1)) / 2;
  const partneredPairs = [...players].reduce((cnt, a, i) =>
    cnt + players.slice(i + 1).filter(
      (b) => (partnerCount.get(pairKey(a, b)) ?? 0) > 0
    ).length, 0
  );
  const allPartnered = partneredPairs === totalPairs;

  // Fairness validation
  const fairness = checkFairness(players, schedule);

  const gamesArr = Array.from(fairness.gamesPlayed.values());
  const minGames = Math.min(...gamesArr);
  const maxGames = Math.max(...gamesArr);
  const gameBalanceOk = maxGames - minGames <= 1;

  const noConsecutivePartners = fairness.consecutivePartnerships.length === 0;
  const noConsecutiveByes = fairness.consecutiveByes.length === 0;
  const noByeViolations = fairness.byeDistributionViolations.length === 0;

  // Consecutive matchups are unavoidable when only one possible player group
  // exists for a court (i.e., exactly 4 players, 1 court — same 4 always play).
  const maxCourts = Math.min(numCourts, Math.floor(numPlayers / 4));
  const maxPossibleMatchups = Math.floor(
    schedule.length * maxCourts
  ); // upper bound on unique matchups

  // When every player fills every court slot (no sitters) and n=4, there is only
  // one possible 4-player group, so consecutive matchup repeats are unavoidable.
  const consecutiveMatchupsUnavoidable = numPlayers === 4 && maxCourts === 1;
  const noConsecutiveMatchups =
    consecutiveMatchupsUnavoidable || fairness.consecutiveMatchups.length === 0;

  const pass =
    allPartnered &&
    gameBalanceOk &&
    noConsecutivePartners &&
    noConsecutiveByes &&
    noByeViolations &&
    noConsecutiveMatchups;

  const label = pass ? 'PASS' : 'FAIL';

  console.log(
    `[${label}] ${numPlayers}p/${numCourts}c => ` +
    `${schedule.length} rounds (est: ${estimate.rounds}), ` +
    `${partneredPairs}/${totalPairs} pairs, ` +
    `games: ${minGames}–${maxGames}, ` +
    `unique matchups: ${fairness.uniqueMatchups}/${maxPossibleMatchups} slots`
  );

  if (!allPartnered)
    console.log(`  ✗ NOT all pairs partnered (${partneredPairs}/${totalPairs})`);
  if (!gameBalanceOk)
    console.log(`  ✗ Game imbalance: ${minGames}–${maxGames}`);
  if (!noConsecutivePartners) {
    console.log(`  ✗ Consecutive partnerships:`);
    for (const v of fairness.consecutivePartnerships)
      console.log(`      ${v}`);
  }
  if (!noConsecutiveByes) {
    console.log(`  ✗ Consecutive byes:`);
    for (const v of fairness.consecutiveByes)
      console.log(`      ${v}`);
  }
  if (!noByeViolations) {
    console.log(`  ✗ Bye distribution violations:`);
    for (const v of fairness.byeDistributionViolations)
      console.log(`      ${v}`);
  }
  if (!noConsecutiveMatchups) {
    console.log(`  ✗ Consecutive matchup repeats:`);
    for (const v of fairness.consecutiveMatchups)
      console.log(`      ${v}`);
  }

  // Bye distribution summary (always shown when byes exist)
  const byeVals = Array.from(fairness.byeCounts.values());
  const minBye = Math.min(...byeVals);
  const maxBye = Math.max(...byeVals);
  if (maxBye > 0) {
    const byeDist = players
      .map((p) => `${p}:${fairness.byeCounts.get(p)}`)
      .join(' ');
    console.log(`  Byes (${minBye}–${maxBye}): ${byeDist}`);
  }

  return pass;
}

// ─── Fixed-partners tests ──────────────────────────────────────────────────────

function testFixed(numPlayers: number, numCourts: number): boolean {
  if (numPlayers % 2 !== 0) {
    console.log(`[SKIP] Fixed: ${numPlayers}p (odd — requires even)`);
    return true;
  }

  const players = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  const schedule = generateFixedSchedule(players, numCourts);

  const numTeams = numPlayers / 2;
  const expectedMatchups = (numTeams * (numTeams - 1)) / 2;

  const matchups = new Set<string>();
  for (const round of schedule) {
    for (const match of round.matches) {
      const t1Key = [...match.team1].sort().join(',');
      const t2Key = [...match.team2].sort().join(',');
      const mKey = [t1Key, t2Key].sort().join(' vs ');
      matchups.add(mKey);
    }
  }

  const allPlayed = matchups.size === expectedMatchups;
  const label = allPlayed ? 'PASS' : 'FAIL';
  console.log(
    `[${label}] Fixed ${numPlayers}p/${numTeams} teams/${numCourts}c => ` +
    `${schedule.length} rounds, ${matchups.size}/${expectedMatchups} matchups`
  );

  return allPlayed;
}

// ─── Detailed scenario report ──────────────────────────────────────────────────

function printDetailedReport(numPlayers: number, numCourts: number, rounds: number) {
  const players = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  const schedule = generateRotatingSchedule(players, numCourts).slice(0, rounds);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Detailed Report: ${numPlayers} players, ${numCourts} courts, ${rounds} rounds`);
  console.log('─'.repeat(60));

  for (const round of schedule) {
    const lines = round.matches.map(
      (m) => `  Court ${m.court}: ${m.team1.join('&')} vs ${m.team2.join('&')}`
    );
    const sit = round.sitting.length
      ? `  Sitting: ${round.sitting.join(', ')}`
      : '';
    console.log(`Round ${round.roundNumber}:`);
    for (const l of lines) console.log(l);
    if (sit) console.log(sit);
  }

  const fairness = checkFairness(players, schedule);

  console.log('\nSummary:');
  console.log(`  Consecutive partnerships: ${fairness.consecutivePartnerships.length}`);
  console.log(`  Consecutive byes:         ${fairness.consecutiveByes.length}`);
  console.log(`  Bye distribution errors:  ${fairness.byeDistributionViolations.length}`);
  console.log(`  Consecutive matchups:     ${fairness.consecutiveMatchups.length}`);
  console.log(`  Unique 4p matchups used:  ${fairness.uniqueMatchups}`);

  const games = players.map((p) => `${p}:${fairness.gamesPlayed.get(p)}`).join(' ');
  const byes  = players.map((p) => `${p}:${fairness.byeCounts.get(p)}`).join(' ');
  console.log(`  Games played: ${games}`);
  console.log(`  Byes:         ${byes}`);

  if (fairness.consecutivePartnerships.length) {
    console.log('  ✗ Consecutive partnerships:', fairness.consecutivePartnerships);
  }
  if (fairness.consecutiveByes.length) {
    console.log('  ✗ Consecutive byes:', fairness.consecutiveByes);
  }
  if (fairness.byeDistributionViolations.length) {
    console.log('  ✗ Bye distribution:', fairness.byeDistributionViolations);
  }
  if (fairness.consecutiveMatchups.length) {
    console.log('  ✗ Consecutive matchups:', fairness.consecutiveMatchups);
  }
}

// ─── Run all tests ─────────────────────────────────────────────────────────────

console.log('=== SCHEDULING ALGORITHM TEST SUITE ===\n');

console.log('── Rotating Partners (fairness + coverage) ──');
let allPass = true;

// NOTE: [8, 1] is intentionally excluded.
// When n = 2 × (courts × 4), exactly half the players sit every round.
// The no-consecutive-bye constraint then forces strict alternation between two
// fixed groups, making full all-pairs coverage mathematically impossible without
// violating the consecutive-bye rule. This is an edge case not representative of
// real pickleball tournaments (which use ≥2 courts for 8 players).
const rotatingTests: [number, number][] = [
  [4, 1], [6, 1], [6, 2],
  [8, 2],
  [10, 2], [10, 3],
  [12, 3], [12, 2],
  [14, 3], [14, 4],
];

for (const [players, courts] of rotatingTests) {
  if (!testRotating(players, courts)) allPass = false;
}

console.log('\n── Fixed Partners (full round-robin coverage) ──');

const fixedTests: [number, number][] = [
  [4, 1], [6, 1], [6, 2],
  [8, 2], [8, 1],
  [10, 2], [10, 3],
  [12, 3], [14, 3],
];

for (const [players, courts] of fixedTests) {
  if (!testFixed(players, courts)) allPass = false;
}

// ── Detailed scenario reports from the requirements ──
printDetailedReport(8,  2, 7);
printDetailedReport(10, 2, 9);
printDetailedReport(12, 3, 11);
printDetailedReport(14, 3, 13);

console.log(`\n${'═'.repeat(60)}`);
console.log(`RESULT: ${allPass ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
console.log('═'.repeat(60));

process.exit(allPass ? 0 : 1);
