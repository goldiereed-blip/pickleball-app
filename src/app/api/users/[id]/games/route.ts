import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { id: userId } = params;

    // Get all games where this user has a linked player
    const result = await db.execute({
      sql: `SELECT DISTINCT g.id, g.code, g.name, g.mode, g.scheduled_at, g.created_at,
                   g.is_complete, g.started, g.schedule_generated,
                   p.id as player_id, p.name as player_name
            FROM games g
            JOIN players p ON p.game_id = g.id AND p.user_id = ?
            ORDER BY g.created_at DESC`,
      args: [userId],
    });

    // Also include games created by this user (even if not a player)
    const createdResult = await db.execute({
      sql: `SELECT g.id, g.code, g.name, g.mode, g.scheduled_at, g.created_at,
                   g.is_complete, g.started, g.schedule_generated
            FROM games g
            WHERE g.created_by = ?
            ORDER BY g.created_at DESC`,
      args: [userId],
    });

    // Merge and deduplicate
    const gamesMap = new Map<string, Record<string, unknown>>();

    for (const row of result.rows) {
      const gameId = row.id as string;
      if (!gamesMap.has(gameId)) {
        gamesMap.set(gameId, {
          id: gameId,
          code: row.code,
          name: row.name,
          mode: row.mode,
          scheduled_at: row.scheduled_at,
          created_at: row.created_at,
          is_complete: row.is_complete,
          started: row.started,
          schedule_generated: row.schedule_generated,
          player_id: row.player_id,
          player_name: row.player_name,
          is_creator: false,
        });
      }
    }

    for (const row of createdResult.rows) {
      const gameId = row.id as string;
      if (gamesMap.has(gameId)) {
        gamesMap.get(gameId)!.is_creator = true;
      } else {
        gamesMap.set(gameId, {
          id: gameId,
          code: row.code,
          name: row.name,
          mode: row.mode,
          scheduled_at: row.scheduled_at,
          created_at: row.created_at,
          is_complete: row.is_complete,
          started: row.started,
          schedule_generated: row.schedule_generated,
          player_id: null,
          player_name: null,
          is_creator: true,
        });
      }
    }

    // Get per-game stats for games where user is a player
    const games = [];
    for (const game of Array.from(gamesMap.values())) {
      let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;

      if (game.player_id) {
        const pid = game.player_id as string;
        const gid = game.id as string;

        const t1 = await db.execute({
          sql: `SELECT team1_score, team2_score FROM matches
                WHERE is_completed = 1 AND game_id = ?
                AND (team1_player1_id = ? OR team1_player2_id = ?)`,
          args: [gid, pid, pid],
        });

        for (const m of t1.rows) {
          const s1 = m.team1_score as number;
          const s2 = m.team2_score as number;
          pointsFor += s1;
          pointsAgainst += s2;
          if (s1 > s2) wins++;
          else losses++;
        }

        const t2 = await db.execute({
          sql: `SELECT team1_score, team2_score FROM matches
                WHERE is_completed = 1 AND game_id = ?
                AND (team2_player1_id = ? OR team2_player2_id = ?)`,
          args: [gid, pid, pid],
        });

        for (const m of t2.rows) {
          const s1 = m.team1_score as number;
          const s2 = m.team2_score as number;
          pointsFor += s2;
          pointsAgainst += s1;
          if (s2 > s1) wins++;
          else losses++;
        }
      }

      games.push({
        ...game,
        stats: { wins, losses, points_for: pointsFor, points_against: pointsAgainst },
      });
    }

    return NextResponse.json(games);
  } catch (e: unknown) {
    console.error('GET /api/users/[id]/games error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
