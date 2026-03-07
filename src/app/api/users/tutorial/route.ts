import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH() {
  try {
    await initDb();
    const db = getDb();
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await db.execute({
      sql: 'UPDATE users SET has_seen_tutorial = 1 WHERE id = ?',
      args: [user.id],
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/users/tutorial error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
