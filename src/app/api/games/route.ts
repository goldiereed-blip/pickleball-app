import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateCode, generateId } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    const body = await request.json();
    const { name, num_courts, mode, scheduled_at, max_players } = body;

    if (!name || !num_courts || !mode || !max_players) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (num_courts < 1 || num_courts > 12) {
      return NextResponse.json({ error: 'Courts must be between 1 and 12' }, { status: 400 });
    }

    if (mode !== 'rotating' && mode !== 'fixed') {
      return NextResponse.json({ error: 'Mode must be rotating or fixed' }, { status: 400 });
    }

    if (max_players < 4 || max_players > 48) {
      return NextResponse.json({ error: 'Max players must be between 4 and 48' }, { status: 400 });
    }

    const id = generateId();
    let code = generateCode();

    // Ensure unique code
    for (let attempt = 0; attempt < 10; attempt++) {
      const existing = await db.execute({
        sql: 'SELECT id FROM games WHERE code = ?',
        args: [code],
      });
      if (existing.rows.length === 0) break;
      code = generateCode();
    }

    // Get current user if logged in
    const user = await getSession();
    const createdBy = user?.id || null;

    await db.execute({
      sql: 'INSERT INTO games (id, code, name, num_courts, mode, max_players, scheduled_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, code, name, num_courts, mode, max_players, scheduled_at || null, createdBy],
    });

    // Auto-create a player record for the host
    if (user) {
      const playerId = generateId();
      await db.execute({
        sql: "INSERT INTO players (id, game_id, name, order_num, claimed_by, user_id, role) VALUES (?, ?, ?, 0, ?, ?, 'host')",
        args: [playerId, id, user.display_name, user.id, user.id],
      });
    }

    return NextResponse.json({ id, code, name, num_courts, mode, max_players, scheduled_at: scheduled_at || null, created_by: createdBy });
  } catch (e: unknown) {
    console.error('POST /api/games error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
