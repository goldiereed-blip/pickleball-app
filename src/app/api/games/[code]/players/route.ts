import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';

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

    const players = await db.execute({
      sql: 'SELECT * FROM players WHERE game_id = ? ORDER BY order_num ASC, created_at ASC',
      args: [gameId],
    });

    return NextResponse.json(players.rows);
  } catch (e: unknown) {
    console.error('GET /api/games/[code]/players error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const game = await db.execute({
      sql: 'SELECT id, started FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const started = game.rows[0].started as number;

    if (started) {
      return NextResponse.json({ error: 'Tournament has started. Cannot add players.' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    // Check player count
    const count = await db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM players WHERE game_id = ?',
      args: [gameId],
    });
    const currentCount = count.rows[0].cnt as number;

    if (currentCount >= 14) {
      return NextResponse.json({ error: 'Maximum 14 players reached' }, { status: 400 });
    }

    const id = generateId();

    await db.execute({
      sql: 'INSERT INTO players (id, game_id, name, order_num) VALUES (?, ?, ?, ?)',
      args: [id, gameId, name.trim(), currentCount],
    });

    return NextResponse.json({ id, game_id: gameId, name: name.trim(), is_playing: 1, order_num: currentCount });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/players error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
