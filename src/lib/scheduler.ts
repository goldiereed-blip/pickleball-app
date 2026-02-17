import { ScheduleMatch, ScheduleRound } from './types';

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a rotating-partners schedule where every pair of players
 * partners together at least once. Improved algorithm that also tracks
 * opponent matchups to ensure variety, and uses randomization to avoid
 * repetitive pairings.
 */
export function generateRotatingSchedule(
  playerIds: string[],
  numCourts: number
): ScheduleRound[] {
  const n = playerIds.length;
  const maxCourts = Math.min(numCourts, Math.floor(n / 4));

  if (maxCourts === 0 || n < 4) return [];

  const partnerCount = new Map<string, number>();
  const opponentCount = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();

  for (const p of playerIds) gamesPlayed.set(p, 0);

  const totalPairs = (n * (n - 1)) / 2;
  let partneredPairs = 0;

  const rounds: ScheduleRound[] = [];
  const maxRounds = Math.ceil(totalPairs / (maxCourts * 2)) + n;

  while (partneredPairs < totalPairs && rounds.length < maxRounds) {
    // Select active players — those with fewest games get priority, but shuffle within same count
    const sorted = [...playerIds].sort((a, b) => {
      const diff = gamesPlayed.get(a)! - gamesPlayed.get(b)!;
      if (diff !== 0) return diff;
      return Math.random() - 0.5; // randomize among equal game counts
    });
    const activeCount = maxCourts * 4;
    const active = sorted.slice(0, activeCount);
    const sitting = sorted.slice(activeCount);

    const matches: ScheduleMatch[] = [];
    const used = new Set<string>();

    for (let c = 0; c < maxCourts; c++) {
      const available = shuffle(active.filter((p) => !used.has(p)));
      if (available.length < 4) break;

      // Find pair with lowest partner count among available players
      // Collect all candidate pairs and pick from the best ones with randomization
      const candidatePairs: { pair: [string, string]; score: number }[] = [];

      for (let i = 0; i < available.length; i++) {
        for (let j = i + 1; j < available.length; j++) {
          const pc = partnerCount.get(pairKey(available[i], available[j])) || 0;
          candidatePairs.push({ pair: [available[i], available[j]], score: pc });
        }
      }

      // Sort by score (lowest partner count first), then pick randomly among the best
      candidatePairs.sort((a, b) => a.score - b.score);
      const bestScore = candidatePairs[0]?.score;
      if (bestScore === undefined) break;

      const bestPairs = candidatePairs.filter((c) => c.score === bestScore);
      const chosenT1Idx = Math.floor(Math.random() * bestPairs.length);
      const bestT1 = bestPairs[chosenT1Idx].pair as [string, string];

      // Find best opponent pair from remaining available players
      // Factor in opponent count to avoid repetitive matchups
      const others = available.filter(
        (p) => !used.has(p) && p !== bestT1[0] && p !== bestT1[1]
      );

      const oppCandidates: { pair: [string, string]; score: number }[] = [];

      for (let i = 0; i < others.length; i++) {
        for (let j = i + 1; j < others.length; j++) {
          const pc = partnerCount.get(pairKey(others[i], others[j])) || 0;
          // Also consider how often these players have been opponents of team1
          const oppScore =
            (opponentCount.get(pairKey(bestT1[0], others[i])) || 0) +
            (opponentCount.get(pairKey(bestT1[0], others[j])) || 0) +
            (opponentCount.get(pairKey(bestT1[1], others[i])) || 0) +
            (opponentCount.get(pairKey(bestT1[1], others[j])) || 0);

          let score = -pc; // prefer un-partnered pairs
          if (pc === 0) score += 100;
          score -= oppScore * 2; // penalize repeated opponents
          oppCandidates.push({ pair: [others[i], others[j]], score });
        }
      }

      if (oppCandidates.length === 0) break;

      // Sort descending by score and pick randomly among the best
      oppCandidates.sort((a, b) => b.score - a.score);
      const bestOppScore = oppCandidates[0].score;
      const bestOppPairs = oppCandidates.filter((c) => c.score === bestOppScore);
      const chosenT2Idx = Math.floor(Math.random() * bestOppPairs.length);
      const bestT2 = bestOppPairs[chosenT2Idx].pair as [string, string];

      matches.push({
        court: c + 1,
        team1: bestT1,
        team2: bestT2,
      });

      used.add(bestT1[0]);
      used.add(bestT1[1]);
      used.add(bestT2[0]);
      used.add(bestT2[1]);
    }

    // Update tracking
    for (const m of matches) {
      const pk1 = pairKey(m.team1[0], m.team1[1]);
      const prev1 = partnerCount.get(pk1) || 0;
      if (prev1 === 0) partneredPairs++;
      partnerCount.set(pk1, prev1 + 1);

      const pk2 = pairKey(m.team2[0], m.team2[1]);
      const prev2 = partnerCount.get(pk2) || 0;
      if (prev2 === 0) partneredPairs++;
      partnerCount.set(pk2, prev2 + 1);

      // Track opponents
      for (const p1 of m.team1) {
        for (const p2 of m.team2) {
          const ok = pairKey(p1, p2);
          opponentCount.set(ok, (opponentCount.get(ok) || 0) + 1);
        }
      }

      for (const p of [m.team1[0], m.team1[1], m.team2[0], m.team2[1]]) {
        gamesPlayed.set(p, gamesPlayed.get(p)! + 1);
      }
    }

    const extraSitting = active.filter((p) => !used.has(p));

    rounds.push({
      roundNumber: rounds.length + 1,
      matches,
      sitting: [...sitting, ...extraSitting],
    });
  }

  return rounds;
}

/**
 * Generate a fixed-partners schedule. If teamPairings are provided, use those.
 * Otherwise, players are paired in order: (1,2), (3,4), (5,6), etc.
 * Each team plays every other team.
 */
export function generateFixedSchedule(
  playerIds: string[],
  numCourts: number,
  teamPairings?: [string, string][]
): ScheduleRound[] {
  // Need even number of players, at least 4
  const n = playerIds.length;
  if (n < 4 || n % 2 !== 0) return [];

  // Use provided team pairings or create teams from consecutive pairs
  const teams: [string, string][] = teamPairings || [];
  if (teams.length === 0) {
    for (let i = 0; i < n; i += 2) {
      teams.push([playerIds[i], playerIds[i + 1]]);
    }
  }

  const T = teams.length;
  const maxCourts = Math.min(numCourts, Math.floor(T / 2));

  if (maxCourts === 0) return [];

  // Circle method for round-robin scheduling
  const teamIndices = Array.from({ length: T }, (_, i) => i);
  const isEven = T % 2 === 0;
  const numRoundsRR = isEven ? T - 1 : T;

  const allRoundMatchups: [number, number][][] = [];

  if (isEven) {
    const rot = [...teamIndices.filter((i) => i !== T - 1)];
    for (let r = 0; r < numRoundsRR; r++) {
      const matchups: [number, number][] = [];
      // Fixed team vs first rotating
      matchups.push([T - 1, rot[0]]);
      // Pair rest from opposite ends: rot[1] vs rot[T-2], rot[2] vs rot[T-3], etc.
      for (let i = 1; i <= (T - 2) / 2; i++) {
        matchups.push([rot[i], rot[T - 1 - i]]);
      }
      allRoundMatchups.push(matchups);
      // Rotate: move first to end
      rot.push(rot.shift()!);
    }
  } else {
    // Odd number of teams: one team has a bye each round
    const rot = [...teamIndices];
    for (let r = 0; r < numRoundsRR; r++) {
      const matchups: [number, number][] = [];
      // rot[0] has bye
      for (let i = 1; i <= (T - 1) / 2; i++) {
        matchups.push([rot[i], rot[T - i]]);
      }
      allRoundMatchups.push(matchups);
      rot.push(rot.shift()!);
    }
  }

  // Pack matchups into rounds based on available courts
  const rounds: ScheduleRound[] = [];
  let roundNum = 1;

  for (const rrMatchups of allRoundMatchups) {
    // Filter out any self-matches (safety check)
    const validMatchups = rrMatchups.filter(([a, b]) => a !== b);

    for (let i = 0; i < validMatchups.length; i += maxCourts) {
      const batch = validMatchups.slice(i, i + maxCourts);
      const matches: ScheduleMatch[] = batch.map(([a, b], idx) => ({
        court: idx + 1,
        team1: teams[a],
        team2: teams[b],
      }));

      // Determine who is sitting
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

      rounds.push({
        roundNumber: roundNum++,
        matches,
        sitting: sittingPlayers,
      });
    }
  }

  return rounds;
}

/**
 * Estimate how many rounds are needed for a given config.
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
    return {
      rounds: minRounds + Math.ceil(minRounds * 0.3), // buffer for greedy imperfection
      description: `~${minRounds}–${minRounds + Math.ceil(minRounds * 0.3)} rounds so every player partners with every other player at least once`,
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
