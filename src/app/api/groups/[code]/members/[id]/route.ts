import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getGroupRole, isGroupAdmin } from '@/lib/group-permissions';
import { promoteFromWaitlist } from '@/lib/waitlist';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code, id } = params;

    const group = await db.execute({
      sql: 'SELECT id, created_by FROM groups WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (group.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const groupId = group.rows[0].id as string;
    const createdBy = group.rows[0].created_by as string;
    const role = await getGroupRole(groupId);

    if (!isGroupAdmin(role)) {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 });
    }

    const body = await request.json();

    if (typeof body.role === 'string' && (body.role === 'admin' || body.role === 'member')) {
      // Cannot demote the creator
      const target = await db.execute({
        sql: 'SELECT user_id FROM group_members WHERE id = ?',
        args: [id],
      });

      if (target.rows.length === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      if (target.rows[0].user_id === createdBy && body.role === 'member') {
        return NextResponse.json({ error: 'Cannot demote the group creator' }, { status: 400 });
      }

      await db.execute({
        sql: 'UPDATE group_members SET role = ? WHERE id = ?',
        args: [body.role, id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/groups/[code]/members/[id] error:', e);
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

    // Get the target member
    const target = await db.execute({
      sql: 'SELECT user_id, role FROM group_members WHERE id = ?',
      args: [id],
    });

    if (target.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const targetUserId = target.rows[0].user_id as string;

    // Cannot remove the creator
    if (targetUserId === createdBy) {
      return NextResponse.json({ error: 'Cannot remove the group creator. Delete the group instead.' }, { status: 400 });
    }

    const isSelfLeave = targetUserId === user.id;
    const callerRole = await getGroupRole(groupId);

    if (!isSelfLeave && !isGroupAdmin(callerRole)) {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    // Last-admin guard: prevent the last admin from leaving
    if (isSelfLeave && isGroupAdmin(callerRole)) {
      const otherAdmins = await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ? AND role = ? AND user_id != ?',
        args: [groupId, 'admin', user.id],
      });
      if ((otherAdmins.rows[0].cnt as number) === 0) {
        return NextResponse.json(
          { error: 'You are the only admin. Promote another member to admin before leaving.', code: 'LAST_ADMIN' },
          { status: 400 }
        );
      }
    }

    // Auto-decline upcoming event RSVPs for the removed member
    const upcomingGames = await db.execute({
      sql: 'SELECT id FROM games WHERE group_id = ? AND started = 0 AND is_complete = 0',
      args: [groupId],
    });

    for (const game of upcomingGames.rows) {
      const gameId = game.id as string;
      const playerRecord = await db.execute({
        sql: 'SELECT id, is_playing FROM players WHERE game_id = ? AND user_id = ?',
        args: [gameId, targetUserId],
      });
      if (playerRecord.rows.length > 0) {
        const wasPlaying = (playerRecord.rows[0].is_playing as number) === 1;
        await db.execute({
          sql: 'UPDATE players SET rsvp_status = ?, is_playing = 0 WHERE id = ?',
          args: ['declined', playerRecord.rows[0].id as string],
        });
        if (wasPlaying) {
          await promoteFromWaitlist(gameId);
        }
      }
    }

    await db.execute({
      sql: 'DELETE FROM group_members WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/groups/[code]/members/[id] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
