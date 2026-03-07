import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateCode, generateId } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await db.execute({
      sql: `SELECT g.*,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
              (SELECT COUNT(*) FROM games WHERE group_id = g.id AND is_complete = 0) as active_events_count,
              (SELECT MIN(scheduled_at) FROM games
               WHERE group_id = g.id AND started = 0 AND is_complete = 0
               AND scheduled_at IS NOT NULL) as next_event_at,
              gm.role as user_role
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = ?
            ORDER BY g.created_at DESC`,
      args: [user.id],
    });

    return NextResponse.json(result.rows);
  } catch (e: unknown) {
    console.error('GET /api/groups error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, max_members } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (max_members !== undefined && max_members !== null) {
      if (typeof max_members !== 'number' || max_members < 2) {
        return NextResponse.json({ error: 'Max members must be at least 2' }, { status: 400 });
      }
    }

    const id = generateId();
    let code = generateCode();

    // Ensure unique code
    for (let attempt = 0; attempt < 10; attempt++) {
      const existing = await db.execute({
        sql: 'SELECT id FROM groups WHERE code = ?',
        args: [code],
      });
      if (existing.rows.length === 0) break;
      code = generateCode();
    }

    await db.execute({
      sql: 'INSERT INTO groups (id, code, name, description, max_members, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, code, name.trim(), description?.trim() || null, max_members || null, user.id],
    });

    // Auto-add creator as admin
    const memberId = generateId();
    await db.execute({
      sql: "INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'admin')",
      args: [memberId, id, user.id],
    });

    return NextResponse.json({
      id, code, name: name.trim(),
      description: description?.trim() || null,
      max_members: max_members || null,
      created_by: user.id,
    });
  } catch (e: unknown) {
    console.error('POST /api/groups error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
