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

    const divisions = await db.execute({
      sql: 'SELECT * FROM divisions WHERE game_id = ? ORDER BY court_start ASC',
      args: [gameId],
    });

    return NextResponse.json(divisions.rows);
  } catch (e: unknown) {
    console.error('GET /api/games/[code]/divisions error:', e);
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
      sql: 'SELECT id, num_courts FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const numCourts = game.rows[0].num_courts as number;

    const body = await request.json();
    const { name, court_start, court_end, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Division name is required' }, { status: 400 });
    }

    if (!court_start || !court_end || court_start < 1 || court_end > numCourts || court_start > court_end) {
      return NextResponse.json({ error: `Courts must be between 1 and ${numCourts}` }, { status: 400 });
    }

    // Check for court overlap with existing divisions
    const existing = await db.execute({
      sql: 'SELECT name, court_start, court_end FROM divisions WHERE game_id = ?',
      args: [gameId],
    });

    for (const div of existing.rows) {
      const existStart = div.court_start as number;
      const existEnd = div.court_end as number;
      if (court_start <= existEnd && court_end >= existStart) {
        return NextResponse.json(
          { error: `Courts overlap with "${div.name}" (courts ${existStart}-${existEnd})` },
          { status: 400 }
        );
      }
    }

    const id = generateId();
    await db.execute({
      sql: 'INSERT INTO divisions (id, game_id, name, court_start, court_end, color) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, gameId, name.trim(), court_start, court_end, color || '#854AAF'],
    });

    return NextResponse.json({ id, game_id: gameId, name: name.trim(), court_start, court_end, color: color || '#854AAF' });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/divisions error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
