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

    // Get all players linked to this user
    const playersResult = await db.execute({
      sql: 'SELECT id FROM players WHERE user_id = ?',
      args: [userId],
    });

    if (playersResult.rows.length === 0) {
      return NextResponse.json({
        total_games: 0,
        total_wins: 0,
        total_losses: 0,
        win_percentage: 0,
        total_points_for: 0,
        total_points_against: 0,
        avg_points_per_game: 0,
      });
    }

    const playerIds = playersResult.rows.map((r) => r.id as string);

    let totalWins = 0;
    let totalLosses = 0;
    let totalPointsFor = 0;
    let totalPointsAgainst = 0;

    for (const playerId of playerIds) {
      // Team 1 matches
      const t1 = await db.execute({
        sql: `SELECT team1_score, team2_score FROM matches
              WHERE is_completed = 1
              AND (team1_player1_id = ? OR team1_player2_id = ?)`,
        args: [playerId, playerId],
      });

      for (const m of t1.rows) {
        const s1 = m.team1_score as number;
        const s2 = m.team2_score as number;
        totalPointsFor += s1;
        totalPointsAgainst += s2;
        if (s1 > s2) totalWins++;
        else totalLosses++;
      }

      // Team 2 matches
      const t2 = await db.execute({
        sql: `SELECT team1_score, team2_score FROM matches
              WHERE is_completed = 1
              AND (team2_player1_id = ? OR team2_player2_id = ?)`,
        args: [playerId, playerId],
      });

      for (const m of t2.rows) {
        const s1 = m.team1_score as number;
        const s2 = m.team2_score as number;
        totalPointsFor += s2;
        totalPointsAgainst += s1;
        if (s2 > s1) totalWins++;
        else totalLosses++;
      }
    }

    const totalGames = totalWins + totalLosses;

    return NextResponse.json({
      total_games: totalGames,
      total_wins: totalWins,
      total_losses: totalLosses,
      win_percentage: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
      total_points_for: totalPointsFor,
      total_points_against: totalPointsAgainst,
      avg_points_per_game: totalGames > 0 ? Math.round((totalPointsFor / totalGames) * 10) / 10 : 0,
    });
  } catch (e: unknown) {
    console.error('GET /api/users/[id]/stats error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
