import type { Ranking } from './types';

export interface RankingPlayerRow {
  id: string;
  name: string;
  division_id: string | null;
}

export interface RankingMatchRow {
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_score: number;
  team2_score: number;
}

/**
 * Computes live rankings from raw player and match rows.
 * Pure function — no DB access, easily unit-tested.
 * Tiebreaker: wins desc → point differential desc.
 */
export function computeRankings(
  players: RankingPlayerRow[],
  matches: RankingMatchRow[],
  divisionMap: Map<string, string> = new Map(),
): Ranking[] {
  const stats = new Map<
    string,
    { wins: number; losses: number; pointsFor: number; pointsAgainst: number; gamesPlayed: number }
  >();

  for (const p of players) {
    stats.set(p.id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0 });
  }

  for (const m of matches) {
    const t1Score = m.team1_score;
    const t2Score = m.team2_score;
    const t1Won = t1Score > t2Score;

    const team1 = [m.team1_player1_id, m.team1_player2_id];
    const team2 = [m.team2_player1_id, m.team2_player2_id];

    for (const pid of team1) {
      const s = stats.get(pid);
      if (!s) continue;
      s.gamesPlayed++;
      s.pointsFor += t1Score;
      s.pointsAgainst += t2Score;
      if (t1Won) s.wins++;
      else s.losses++;
    }

    for (const pid of team2) {
      const s = stats.get(pid);
      if (!s) continue;
      s.gamesPlayed++;
      s.pointsFor += t2Score;
      s.pointsAgainst += t1Score;
      if (!t1Won) s.wins++;
      else s.losses++;
    }
  }

  const rankings: Ranking[] = players.map((p) => {
    const s = stats.get(p.id)!;
    const divId = p.division_id;
    return {
      player_id: p.id,
      player_name: p.name,
      wins: s.wins,
      losses: s.losses,
      points_for: s.pointsFor,
      points_against: s.pointsAgainst,
      point_differential: s.pointsFor - s.pointsAgainst,
      games_played: s.gamesPlayed,
      division_id: divId,
      division_name: divId ? (divisionMap.get(divId) ?? null) : null,
    };
  });

  // Primary: wins desc. Tiebreaker: point differential desc.
  rankings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.point_differential - a.point_differential;
  });

  return rankings;
}
