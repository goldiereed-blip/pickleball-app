import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';
import { getSession } from '@/lib/auth';

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
      sql: 'SELECT id, started, created_by FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const started = game.rows[0].started as number;
    const createdBy = game.rows[0].created_by as string | null;

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

    if (currentCount >= 48) {
      return NextResponse.json({ error: 'Maximum 48 players reached' }, { status: 400 });
    }

    const id = generateId();

    // Auto-assign host role if the current user is the game creator
    let role = 'player';
    const user = await getSession();
    if (user && createdBy && user.id === createdBy) {
      // Check if any host already exists for this game
      const existingHost = await db.execute({
        sql: "SELECT id FROM players WHERE game_id = ? AND role = 'host'",
        args: [gameId],
      });
      if (existingHost.rows.length === 0) {
        role = 'host';
      }
    }

    await db.execute({
      sql: 'INSERT INTO players (id, game_id, name, order_num, role) VALUES (?, ?, ?, ?, ?)',
      args: [id, gameId, name.trim(), currentCount, role],
    });

    return NextResponse.json({
      id, game_id: gameId, name: name.trim(), is_playing: 1,
      order_num: currentCount, role, division_id: null, is_here: 0,
    });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/players error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
