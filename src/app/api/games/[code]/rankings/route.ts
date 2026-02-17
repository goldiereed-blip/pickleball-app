import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import type { Ranking } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const game = await db.execute({
      sql: 'SELECT id FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;

    // Get division info for players
    const divisionsResult = await db.execute({
      sql: 'SELECT id, name FROM divisions WHERE game_id = ?',
      args: [gameId],
    });
    const divisionMap = new Map<string, string>();
    for (const d of divisionsResult.rows) {
      divisionMap.set(d.id as string, d.name as string);
    }

    // Get all active players
    const players = await db.execute({
      sql: 'SELECT id, name, division_id FROM players WHERE game_id = ? AND is_playing = 1 ORDER BY order_num ASC',
      args: [gameId],
    });

    // Get all completed matches
    const matches = await db.execute({
      sql: 'SELECT * FROM matches WHERE game_id = ? AND is_completed = 1',
      args: [gameId],
    });

    // Calculate rankings
    const stats = new Map<
      string,
      { wins: number; losses: number; pointsFor: number; pointsAgainst: number; gamesPlayed: number }
    >();

    for (const p of players.rows) {
      stats.set(p.id as string, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0 });
    }

    for (const m of matches.rows) {
      const t1Score = m.team1_score as number;
      const t2Score = m.team2_score as number;
      const t1Won = t1Score > t2Score;

      const team1 = [m.team1_player1_id as string, m.team1_player2_id as string];
      const team2 = [m.team2_player1_id as string, m.team2_player2_id as string];

      for (const pid of team1) {
        const s = stats.get(pid);
        if (!s) continue;
        s.gamesPlayed++;
        s.pointsFor += t1Score;
        s.pointsAgainst += t2Score;
        if (t1Won) s.wins++;
        else if (t2Score > t1Score) s.losses++;
      }

      for (const pid of team2) {
        const s = stats.get(pid);
        if (!s) continue;
        s.gamesPlayed++;
        s.pointsFor += t2Score;
        s.pointsAgainst += t1Score;
        if (!t1Won && t2Score > t1Score) s.wins++;
        else if (t1Won) s.losses++;
      }
    }

    const rankings: Ranking[] = players.rows.map((p) => {
      const s = stats.get(p.id as string)!;
      const divId = p.division_id as string | null;
      return {
        player_id: p.id as string,
        player_name: p.name as string,
        wins: s.wins,
        losses: s.losses,
        points_for: s.pointsFor,
        points_against: s.pointsAgainst,
        point_differential: s.pointsFor - s.pointsAgainst,
        games_played: s.gamesPlayed,
        division_id: divId,
        division_name: divId ? (divisionMap.get(divId) || null) : null,
      };
    });

    // Sort: primary by wins desc, tiebreaker by point differential desc
    rankings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.point_differential - a.point_differential;
    });

    return NextResponse.json(rankings);
  } catch (e: unknown) {
    console.error('GET /api/games/[code]/rankings error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
