import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function POST(
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
    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'assignments must be an array' }, { status: 400 });
    }

    for (const a of assignments) {
      if (!a.player_id) continue;
      await db.execute({
        sql: 'UPDATE players SET division_id = ? WHERE id = ? AND game_id = ?',
        args: [a.division_id || null, a.player_id, gameId],
      });
    }

    return NextResponse.json({ success: true, count: assignments.length });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/players/assign error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
