import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
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

    // Check membership
    const membership = await db.execute({
      sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      args: [groupId, user.id],
    });

    if (membership.rows.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Filter by status if provided
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let sql = `
      SELECT
        g.*,
        (SELECT COUNT(*) FROM players WHERE game_id = g.id AND is_playing = 1) as spots_filled,
        (SELECT COUNT(*) FROM players WHERE game_id = g.id AND waitlist_position IS NOT NULL) as waitlist_count,
        (SELECT id FROM players WHERE game_id = g.id AND user_id = ?) as my_player_id,
        (SELECT is_playing FROM players WHERE game_id = g.id AND user_id = ?) as my_is_playing,
        (SELECT waitlist_position FROM players WHERE game_id = g.id AND user_id = ?) as my_waitlist_position
      FROM games g
      WHERE g.group_id = ?`;
    const args: (string | number)[] = [user.id, user.id, user.id, groupId];

    if (status === 'upcoming') {
      sql += ' AND g.started = 0 AND g.is_complete = 0';
    } else if (status === 'active') {
      sql += ' AND g.started = 1 AND g.is_complete = 0';
    } else if (status === 'past') {
      sql += ' AND g.is_complete = 1';
    }

    if (status === 'past') {
      sql += ' ORDER BY COALESCE(g.scheduled_at, g.created_at) DESC';
    } else {
      sql += ' ORDER BY COALESCE(g.scheduled_at, g.created_at) ASC';
    }

    const result = await db.execute({ sql, args });
    return NextResponse.json(result.rows);
  } catch (e: unknown) {
    console.error('GET /api/groups/[code]/events error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
