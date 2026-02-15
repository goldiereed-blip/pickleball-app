import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
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

  return NextResponse.json({ success: true });
}
