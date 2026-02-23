import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getCallerRole, canManage } from '@/lib/api-permissions';

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

    // Most game mutations require host/cohost
    const callerRole = await getCallerRole(gameId);

    if (typeof body.started === 'number') {
      if (!canManage(callerRole)) {
        return NextResponse.json({ error: 'Only host or co-host can start the game' }, { status: 403 });
      }
      await db.execute({
        sql: 'UPDATE games SET started = ? WHERE id = ?',
        args: [body.started, gameId],
      });
    }

    if (typeof body.num_rounds === 'number') {
      if (!canManage(callerRole)) {
        return NextResponse.json({ error: 'Only host or co-host can set rounds' }, { status: 403 });
      }
      await db.execute({
        sql: 'UPDATE games SET num_rounds = ? WHERE id = ?',
        args: [body.num_rounds, gameId],
      });
    }

    if (typeof body.is_complete === 'number') {
      if (!canManage(callerRole)) {
        return NextResponse.json({ error: 'Only host or co-host can complete the game' }, { status: 403 });
      }
      await db.execute({
        sql: 'UPDATE games SET is_complete = ? WHERE id = ?',
        args: [body.is_complete, gameId],
      });
    }

    // Reopen game — clear schedule and return to "not started" state
    if (body.reopen === 1) {
      if (!canManage(callerRole)) {
        return NextResponse.json({ error: 'Only host or co-host can reopen the game' }, { status: 403 });
      }

      const currentGame = game.rows[0];
      if (!(currentGame.started as number)) {
        return NextResponse.json({ error: 'Game is not started' }, { status: 400 });
      }

      // Check if any scores have been entered
      const scoredMatches = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM matches WHERE game_id = ? AND is_completed = 1`,
        args: [gameId],
      });
      if ((scoredMatches.rows[0].cnt as number) > 0) {
        return NextResponse.json({ error: 'Cannot reopen — games have already been played' }, { status: 400 });
      }

      // Clear schedule: delete matches, rounds
      await db.execute({ sql: 'DELETE FROM matches WHERE game_id = ?', args: [gameId] });
      await db.execute({ sql: 'DELETE FROM rounds WHERE game_id = ?', args: [gameId] });

      // Reset game state
      await db.execute({
        sql: 'UPDATE games SET started = 0, schedule_generated = 0, num_rounds = NULL WHERE id = ?',
        args: [gameId],
      });
    }

    if (typeof body.max_players === 'number') {
      if (!canManage(callerRole)) {
        return NextResponse.json({ error: 'Only host or co-host can change max players' }, { status: 403 });
      }
      const clamped = Math.max(4, Math.min(48, body.max_players));
      await db.execute({
        sql: 'UPDATE games SET max_players = ? WHERE id = ?',
        args: [clamped, gameId],
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
      sql: 'SELECT id FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;

    // Only the host can delete the game
    const callerRole = await getCallerRole(gameId);
    if (callerRole !== 'host') {
      return NextResponse.json({ error: 'Only the host can delete this game' }, { status: 403 });
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
