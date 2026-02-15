/**
 * Test script for the scheduling algorithm.
 * Run with: npx tsx src/lib/test-scheduler.ts
 */

import { generateRotatingSchedule, generateFixedSchedule, estimateRounds } from './scheduler';

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function testRotating(numPlayers: number, numCourts: number) {
  const players = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  const schedule = generateRotatingSchedule(players, numCourts);

  const partnerCount = new Map<string, number>();
  const opponentCount = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();

  for (const p of players) gamesPlayed.set(p, 0);

  for (const round of schedule) {
    for (const match of round.matches) {
      // Track partnerships
      const pk1 = pairKey(match.team1[0], match.team1[1]);
      partnerCount.set(pk1, (partnerCount.get(pk1) || 0) + 1);
      const pk2 = pairKey(match.team2[0], match.team2[1]);
      partnerCount.set(pk2, (partnerCount.get(pk2) || 0) + 1);

      // Track opponents
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = pairKey(a, b);
          opponentCount.set(ok, (opponentCount.get(ok) || 0) + 1);
        }
      }

      // Track games played
      for (const p of [...match.team1, ...match.team2]) {
        gamesPlayed.set(p, gamesPlayed.get(p)! + 1);
      }
    }
  }

  // Check: every pair partnered at least once
  const totalPairs = (numPlayers * (numPlayers - 1)) / 2;
  let partneredPairs = 0;
  let unpartnered: string[] = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const pk = pairKey(players[i], players[j]);
      if ((partnerCount.get(pk) || 0) > 0) {
        partneredPairs++;
      } else {
        unpartnered.push(`${players[i]}-${players[j]}`);
      }
    }
  }

  const gamesArr = Array.from(gamesPlayed.values());
  const minGames = Math.min(...gamesArr);
  const maxGames = Math.max(...gamesArr);

  const allPartnered = partneredPairs === totalPairs;
  const estimate = estimateRounds(numPlayers, numCourts, 'rotating');

  console.log(
    `[${allPartnered ? 'PASS' : 'FAIL'}] Rotating: ${numPlayers} players, ${numCourts} courts => ` +
    `${schedule.length} rounds (est: ${estimate.rounds}), ` +
    `${partneredPairs}/${totalPairs} pairs partnered, ` +
    `games per player: ${minGames}-${maxGames}`
  );

  if (!allPartnered) {
    console.log(`  Unpartnered: ${unpartnered.join(', ')}`);
  }

  return allPartnered;
}

function testFixed(numPlayers: number, numCourts: number) {
  if (numPlayers % 2 !== 0) {
    console.log(`[SKIP] Fixed: ${numPlayers} players (odd - requires even)`);
    return true;
  }

  const players = Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  const schedule = generateFixedSchedule(players, numCourts);

  const numTeams = numPlayers / 2;
  const expectedMatchups = (numTeams * (numTeams - 1)) / 2;

  // Count unique team matchups
  const matchups = new Set<string>();
  for (const round of schedule) {
    for (const match of round.matches) {
      const t1Key = match.team1.sort().join(',');
      const t2Key = match.team2.sort().join(',');
      const mKey = [t1Key, t2Key].sort().join(' vs ');
      matchups.add(mKey);
    }
  }

  const allPlayed = matchups.size === expectedMatchups;

  console.log(
    `[${allPlayed ? 'PASS' : 'FAIL'}] Fixed: ${numPlayers} players (${numTeams} teams), ${numCourts} courts => ` +
    `${schedule.length} rounds, ${matchups.size}/${expectedMatchups} matchups`
  );

  return allPlayed;
}

console.log('=== SCHEDULING ALGORITHM TESTS ===\n');

console.log('--- Rotating Partners ---');
let allPass = true;

// Test various configurations
const rotatingTests = [
  [4, 1], [6, 1], [6, 2], [8, 2], [8, 1],
  [10, 2], [10, 3], [12, 3], [12, 2],
  [14, 3], [14, 4],
];

for (const [players, courts] of rotatingTests) {
  if (!testRotating(players, courts)) allPass = false;
}

console.log('\n--- Fixed Partners ---');

const fixedTests = [
  [4, 1], [6, 1], [6, 2], [8, 2], [8, 1],
  [10, 2], [10, 3], [12, 3], [14, 3],
];

for (const [players, courts] of fixedTests) {
  if (!testFixed(players, courts)) allPass = false;
}

console.log(`\n=== ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} ===`);
process.exit(allPass ? 0 : 1);
