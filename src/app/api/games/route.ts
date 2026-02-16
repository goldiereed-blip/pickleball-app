import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateCode, generateId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    const body = await request.json();
    const { name, num_courts, mode, scheduled_at } = body;

    if (!name || !num_courts || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (num_courts < 1 || num_courts > 10) {
      return NextResponse.json({ error: 'Courts must be between 1 and 10' }, { status: 400 });
    }

    if (mode !== 'rotating' && mode !== 'fixed') {
      return NextResponse.json({ error: 'Mode must be rotating or fixed' }, { status: 400 });
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

    await db.execute({
      sql: 'INSERT INTO games (id, code, name, num_courts, mode, scheduled_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, code, name, num_courts, mode, scheduled_at || null],
    });

    return NextResponse.json({ id, code, name, num_courts, mode, scheduled_at: scheduled_at || null });
  } catch (e: unknown) {
    console.error('POST /api/games error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
