import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code, id } = params;

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

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      updates.push('name = ?');
      args.push(body.name.trim());
    }

    if (typeof body.court_start === 'number' && typeof body.court_end === 'number') {
      if (body.court_start < 1 || body.court_end > numCourts || body.court_start > body.court_end) {
        return NextResponse.json({ error: `Courts must be between 1 and ${numCourts}` }, { status: 400 });
      }

      // Check overlap with other divisions (exclude self)
      const existing = await db.execute({
        sql: 'SELECT name, court_start, court_end FROM divisions WHERE game_id = ? AND id != ?',
        args: [gameId, id],
      });

      for (const div of existing.rows) {
        const existStart = div.court_start as number;
        const existEnd = div.court_end as number;
        if (body.court_start <= existEnd && body.court_end >= existStart) {
          return NextResponse.json(
            { error: `Courts overlap with "${div.name}" (courts ${existStart}-${existEnd})` },
            { status: 400 }
          );
        }
      }

      updates.push('court_start = ?');
      args.push(body.court_start);
      updates.push('court_end = ?');
      args.push(body.court_end);
    }

    if (typeof body.color === 'string') {
      updates.push('color = ?');
      args.push(body.color);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE divisions SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/games/[code]/divisions/[id] error:', e);
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
    const { id } = params;

    // Unassign players from this division
    await db.execute({
      sql: 'UPDATE players SET division_id = NULL WHERE division_id = ?',
      args: [id],
    });

    await db.execute({
      sql: 'DELETE FROM divisions WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/games/[code]/divisions/[id] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
