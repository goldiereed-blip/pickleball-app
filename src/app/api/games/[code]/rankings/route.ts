import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { computeRankings } from '@/lib/rankings';
import type { RankingPlayerRow, RankingMatchRow } from '@/lib/rankings';

// Always execute dynamically — never cache rankings (they change with every score)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const [divisionsResult, playersResult, matchesResult] = await Promise.all([
      db.execute({ sql: 'SELECT id, name FROM divisions WHERE game_id = ?', args: [gameId] }),
      db.execute({
        sql: 'SELECT id, name, division_id FROM players WHERE game_id = ? AND is_playing = 1 ORDER BY order_num ASC',
        args: [gameId],
      }),
      db.execute({
        sql: 'SELECT team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score FROM matches WHERE game_id = ? AND is_completed = 1',
        args: [gameId],
      }),
    ]);

    const divisionMap = new Map<string, string>();
    for (const d of divisionsResult.rows) {
      divisionMap.set(d.id as string, d.name as string);
    }

    const players: RankingPlayerRow[] = playersResult.rows.map((p) => ({
      id: p.id as string,
      name: p.name as string,
      division_id: p.division_id as string | null,
    }));

    const matches: RankingMatchRow[] = matchesResult.rows.map((m) => ({
      team1_player1_id: m.team1_player1_id as string,
      team1_player2_id: m.team1_player2_id as string,
      team2_player1_id: m.team2_player1_id as string,
      team2_player2_id: m.team2_player2_id as string,
      team1_score: m.team1_score as number,
      team2_score: m.team2_score as number,
    }));

    const rankings = computeRankings(players, matches, divisionMap);

    return NextResponse.json(rankings, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: unknown) {
    console.error(`GET /api/games/${params.code}/rankings error:`, e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
