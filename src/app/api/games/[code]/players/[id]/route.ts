import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getCallerRole, canManage } from '@/lib/api-permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code, id } = params;

    const game = await db.execute({
      sql: 'SELECT id, started FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const started = game.rows[0].started as number;

    const body = await request.json();

    // Allow claiming regardless of started state
    if (typeof body.claimed_by === 'string') {
      await db.execute({
        sql: 'UPDATE players SET claimed_by = ? WHERE id = ?',
        args: [body.claimed_by, id],
      });
    }

    if (typeof body.user_id === 'string') {
      await db.execute({
        sql: 'UPDATE players SET user_id = ? WHERE id = ?',
        args: [body.user_id, id],
      });
    }

    if (typeof body.is_playing === 'number') {
      // Host/cohost can change status even after start (for injured players)
      if (started) {
        const callerRole = await getCallerRole(gameId);
        if (!canManage(callerRole)) {
          return NextResponse.json({ error: 'Tournament has started. Cannot change player status.' }, { status: 400 });
        }
      }
      await db.execute({
        sql: 'UPDATE players SET is_playing = ? WHERE id = ?',
        args: [body.is_playing, id],
      });
    }

    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      await db.execute({
        sql: 'UPDATE players SET name = ? WHERE id = ?',
        args: [body.name.trim(), id],
      });
    }

    // Division assignment
    if (body.division_id !== undefined) {
      await db.execute({
        sql: 'UPDATE players SET division_id = ? WHERE id = ?',
        args: [body.division_id, id],
      });
    }

    // Check-in
    if (typeof body.is_here === 'number') {
      await db.execute({
        sql: 'UPDATE players SET is_here = ? WHERE id = ?',
        args: [body.is_here, id],
      });
    }

    // Role change — only host can change roles
    if (typeof body.role === 'string' && ['host', 'cohost', 'player'].includes(body.role)) {
      const callerRole = await getCallerRole(gameId);
      if (callerRole !== 'host') {
        return NextResponse.json({ error: 'Only the host can change roles' }, { status: 403 });
      }
      await db.execute({
        sql: 'UPDATE players SET role = ? WHERE id = ?',
        args: [body.role, id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/games/[code]/players/[id] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code, id } = params;

    const game = await db.execute({
      sql: 'SELECT started FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length > 0 && (game.rows[0].started as number)) {
      return NextResponse.json({ error: 'Tournament has started. Cannot remove players.' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM players WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/games/[code]/players/[id] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
