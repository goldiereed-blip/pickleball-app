import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const result = await db.execute({
      sql: 'SELECT * FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (e: unknown) {
    console.error('GET /api/games/[code] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const game = await db.execute({
      sql: 'SELECT * FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const body = await request.json();

    if (typeof body.started === 'number') {
      await db.execute({
        sql: 'UPDATE games SET started = ? WHERE id = ?',
        args: [body.started, gameId],
      });
    }

    if (typeof body.num_rounds === 'number') {
      await db.execute({
        sql: 'UPDATE games SET num_rounds = ? WHERE id = ?',
        args: [body.num_rounds, gameId],
      });
    }

    if (typeof body.is_complete === 'number') {
      await db.execute({
        sql: 'UPDATE games SET is_complete = ? WHERE id = ?',
        args: [body.is_complete, gameId],
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/games/[code] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const game = await db.execute({
      sql: 'SELECT id, created_by FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const createdBy = game.rows[0].created_by as string | null;

    // Check if the current user is the creator
    if (createdBy) {
      const user = await getSession();
      if (!user || user.id !== createdBy) {
        return NextResponse.json({ error: 'Only the game creator can delete this game' }, { status: 403 });
      }
    }

    // Delete in order: matches → rounds → teams → divisions → players → game
    await db.execute({ sql: 'DELETE FROM matches WHERE game_id = ?', args: [gameId] });
    await db.execute({ sql: 'DELETE FROM rounds WHERE game_id = ?', args: [gameId] });
    await db.execute({ sql: 'DELETE FROM teams WHERE game_id = ?', args: [gameId] });
    await db.execute({ sql: 'DELETE FROM divisions WHERE game_id = ?', args: [gameId] });
    await db.execute({ sql: 'DELETE FROM players WHERE game_id = ?', args: [gameId] });
    await db.execute({ sql: 'DELETE FROM games WHERE id = ?', args: [gameId] });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/games/[code] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
