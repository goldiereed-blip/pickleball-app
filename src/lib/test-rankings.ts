/**
 * Unit tests for the rankings calculation.
 * Run with: npx tsx src/lib/test-rankings.ts
 *
 * Fixture: game AT4JLH — 4 players, 3 completed matches
 *   Match 1: Goldie Reed & Player 2  beat  Player 3 & Player 4   (11 – 8)
 *   Match 2: Goldie Reed & Player 3  beat  Player 2 & Player 4   (11 – 7)
 *   Match 3: Goldie Reed & Player 4  beat  Player 2 & Player 3   (11 – 2)
 *
 * Expected final standings:
 *   Goldie Reed  3W 0L  played=3  diff=+16  (33 for, 17 against)
 *   Player 4     1W 2L  played=3  diff= +2  (26 for, 24 against)
 *   Player 3     1W 2L  played=3  diff= −8  (21 for, 29 against)
 *   Player 2     1W 2L  played=3  diff=−10  (20 for, 30 against)
 */

import { computeRankings, type RankingPlayerRow, type RankingMatchRow } from './rankings';

// ─── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, label, ok ? undefined : `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// ─── Fixture ───────────────────────────────────────────────────────────────────

const players: RankingPlayerRow[] = [
  { id: 'goldie', name: 'Goldie Reed', division_id: null },
  { id: 'p2',     name: 'Player 2',    division_id: null },
  { id: 'p3',     name: 'Player 3',    division_id: null },
  { id: 'p4',     name: 'Player 4',    division_id: null },
];

const matches: RankingMatchRow[] = [
  // Match 1: Goldie & P2 beat P3 & P4, 11-8
  { team1_player1_id: 'goldie', team1_player2_id: 'p2', team2_player1_id: 'p3', team2_player2_id: 'p4', team1_score: 11, team2_score: 8 },
  // Match 2: Goldie & P3 beat P2 & P4, 11-7
  { team1_player1_id: 'goldie', team1_player2_id: 'p3', team2_player1_id: 'p2', team2_player2_id: 'p4', team1_score: 11, team2_score: 7 },
  // Match 3: Goldie & P4 beat P2 & P3, 11-2
  { team1_player1_id: 'goldie', team1_player2_id: 'p4', team2_player1_id: 'p2', team2_player2_id: 'p3', team1_score: 11, team2_score: 2 },
];

// ─── Tests ─────────────────────────────────────────────────────────────────────

console.log('=== RANKINGS UNIT TESTS ===\n');

console.log('── AT4JLH fixture (3 matches, 4 players) ──');

const rankings = computeRankings(players, matches);

// Sort order
assertEqual(rankings.map(r => r.player_id), ['goldie', 'p4', 'p3', 'p2'], 'Sort order: wins desc → diff desc');

// Goldie Reed: 3-0, +16
const goldie = rankings.find(r => r.player_id === 'goldie')!;
assertEqual(goldie.wins,               3,   'Goldie wins');
assertEqual(goldie.losses,             0,   'Goldie losses');
assertEqual(goldie.games_played,       3,   'Goldie games_played');
assertEqual(goldie.points_for,         33,  'Goldie points_for (11+11+11)');
assertEqual(goldie.points_against,     17,  'Goldie points_against (8+7+2)');
assertEqual(goldie.point_differential, 16,  'Goldie diff (+16)');

// Player 4: 1-2, +2
const p4 = rankings.find(r => r.player_id === 'p4')!;
assertEqual(p4.wins,               1,  'P4 wins');
assertEqual(p4.losses,             2,  'P4 losses');
assertEqual(p4.games_played,       3,  'P4 games_played');
assertEqual(p4.points_for,         26, 'P4 points_for (8+7+11)');
assertEqual(p4.points_against,     24, 'P4 points_against (11+11+2)');
assertEqual(p4.point_differential, 2,  'P4 diff (+2)');

// Player 3: 1-2, -8
const p3 = rankings.find(r => r.player_id === 'p3')!;
assertEqual(p3.wins,               1,  'P3 wins');
assertEqual(p3.losses,             2,  'P3 losses');
assertEqual(p3.games_played,       3,  'P3 games_played');
assertEqual(p3.points_for,         21, 'P3 points_for (8+11+2)');
assertEqual(p3.points_against,     29, 'P3 points_against (11+7+11)');
assertEqual(p3.point_differential, -8, 'P3 diff (-8)');

// Player 2: 1-2, -10
const p2 = rankings.find(r => r.player_id === 'p2')!;
assertEqual(p2.wins,               1,   'P2 wins');
assertEqual(p2.losses,             2,   'P2 losses');
assertEqual(p2.games_played,       3,   'P2 games_played');
assertEqual(p2.points_for,         20,  'P2 points_for (11+7+2)');
assertEqual(p2.points_against,     30,  'P2 points_against (8+11+11)');
assertEqual(p2.point_differential, -10, 'P2 diff (-10)');

console.log('\n── Edge cases ──');

// No matches: all zeros
const emptyRankings = computeRankings(players, []);
assert(emptyRankings.every(r => r.wins === 0 && r.losses === 0 && r.games_played === 0), 'No matches → all zeros');

// No players: empty result
const noPlayers = computeRankings([], matches);
assertEqual(noPlayers.length, 0, 'No players → empty array');

// Unknown player in match: gracefully ignored (not in stats map)
const unknownMatch: RankingMatchRow[] = [
  { team1_player1_id: 'goldie', team1_player2_id: 'ghost', team2_player1_id: 'p2', team2_player2_id: 'p3', team1_score: 11, team2_score: 5 },
];
const unknownRankings = computeRankings(players, unknownMatch);
const goldieUnknown = unknownRankings.find(r => r.player_id === 'goldie')!;
assert(goldieUnknown.wins === 1 && goldieUnknown.games_played === 1, 'Unknown partner: known players still scored');

// Tiebreaker: same wins, higher diff ranks first
const tiePlayers: RankingPlayerRow[] = [
  { id: 'a', name: 'A', division_id: null },
  { id: 'b', name: 'B', division_id: null },
  { id: 'c', name: 'C', division_id: null },
  { id: 'd', name: 'D', division_id: null },
];
const tieMatches: RankingMatchRow[] = [
  // A&B beat C&D, 11-1 — A and B each get +10 diff
  { team1_player1_id: 'a', team1_player2_id: 'b', team2_player1_id: 'c', team2_player2_id: 'd', team1_score: 11, team2_score: 1 },
];
const tieRankings = computeRankings(tiePlayers, tieMatches);
assertEqual(tieRankings[0].player_id === 'a' || tieRankings[0].player_id === 'b', true, 'Tiebreaker: +10 diff ranks above -10');
assertEqual(tieRankings[2].player_id === 'c' || tieRankings[2].player_id === 'd', true, 'Tiebreaker: -10 diff ranks below +10');

// ─── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`RESULT: ${failed === 0 ? '✓ ALL TESTS PASSED' : `✗ ${failed} FAILED`} (${passed} passed, ${failed} failed)`);
console.log('═'.repeat(50));

process.exit(failed === 0 ? 0 : 1);
