import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const group = await db.execute({
      sql: 'SELECT id FROM groups WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (group.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const groupId = group.rows[0].id as string;

    const members = await db.execute({
      sql: `SELECT gm.id, gm.group_id, gm.user_id, gm.role, gm.created_at,
              u.display_name, u.email
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            ORDER BY gm.role = 'admin' DESC, gm.created_at ASC`,
      args: [groupId],
    });

    return NextResponse.json(members.rows);
  } catch (e: unknown) {
    console.error('GET /api/groups/[code]/members error:', e);
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
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const group = await db.execute({
      sql: 'SELECT id, max_members FROM groups WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (group.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const groupId = group.rows[0].id as string;
    const maxMembers = group.rows[0].max_members as number | null;

    // Check if already a member
    const existing = await db.execute({
      sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      args: [groupId, user.id],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 409 });
    }

    // Check max members
    if (maxMembers) {
      const countResult = await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ?',
        args: [groupId],
      });
      const currentCount = countResult.rows[0].cnt as number;
      if (currentCount >= maxMembers) {
        return NextResponse.json({ error: 'This group is full' }, { status: 400 });
      }
    }

    const id = generateId();
    await db.execute({
      sql: "INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')",
      args: [id, groupId, user.id],
    });

    return NextResponse.json({ id, group_id: groupId, user_id: user.id, role: 'member' });
  } catch (e: unknown) {
    console.error('POST /api/groups/[code]/members error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
