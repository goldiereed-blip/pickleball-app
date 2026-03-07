import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getGroupRole, isGroupAdmin } from '@/lib/group-permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const result = await db.execute({
      sql: `SELECT g.*,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
            FROM groups g
            WHERE g.code = ?`,
      args: [code.toUpperCase()],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (e: unknown) {
    console.error('GET /api/groups/[code] error:', e);
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

    const group = await db.execute({
      sql: 'SELECT id FROM groups WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (group.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const groupId = group.rows[0].id as string;
    const role = await getGroupRole(groupId);

    if (!isGroupAdmin(role)) {
      return NextResponse.json({ error: 'Only group admins can edit settings' }, { status: 403 });
    }

    const body = await request.json();

    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      await db.execute({
        sql: 'UPDATE groups SET name = ? WHERE id = ?',
        args: [body.name.trim(), groupId],
      });
    }

    if (body.description !== undefined) {
      await db.execute({
        sql: 'UPDATE groups SET description = ? WHERE id = ?',
        args: [body.description?.trim() || null, groupId],
      });
    }

    if (body.max_members !== undefined) {
      const newMax = body.max_members;
      if (newMax !== null) {
        if (typeof newMax !== 'number' || newMax < 2) {
          return NextResponse.json({ error: 'Max members must be at least 2' }, { status: 400 });
        }
        // Ensure new max >= current member count
        const countResult = await db.execute({
          sql: 'SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ?',
          args: [groupId],
        });
        const currentCount = countResult.rows[0].cnt as number;
        if (newMax < currentCount) {
          return NextResponse.json({ error: `Cannot set max below current member count (${currentCount})` }, { status: 400 });
        }
      }
      await db.execute({
        sql: 'UPDATE groups SET max_members = ? WHERE id = ?',
        args: [newMax, groupId],
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/groups/[code] error:', e);
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
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const group = await db.execute({
      sql: 'SELECT id, created_by FROM groups WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (group.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const groupId = group.rows[0].id as string;
    const createdBy = group.rows[0].created_by as string;

    if (user.id !== createdBy) {
      return NextResponse.json({ error: 'Only the group creator can delete this group' }, { status: 403 });
    }

    // Unlink games from this group
    await db.execute({
      sql: 'UPDATE games SET group_id = NULL WHERE group_id = ?',
      args: [groupId],
    });

    // Delete members then group (cascade should handle it, but be explicit)
    await db.execute({ sql: 'DELETE FROM group_members WHERE group_id = ?', args: [groupId] });
    await db.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [groupId] });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/groups/[code] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
