import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getCallerRole, canManage } from '@/lib/api-permissions';
import { getSession } from '@/lib/auth';
import { promoteFromWaitlist } from '@/lib/waitlist';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code, id } = params;

    const game = await db.execute({
      sql: 'SELECT id, started, max_players FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const started = game.rows[0].started as number;

    const body = await request.json();

    // Claim protection
    if (typeof body.claimed_by === 'string' || typeof body.user_id === 'string') {
      const session = await getSession();
      const callerRole = await getCallerRole(gameId);

      // Check if this spot is already claimed by someone else
      const existing = await db.execute({
        sql: 'SELECT user_id FROM players WHERE id = ?',
        args: [id],
      });
      if (existing.rows.length > 0 && existing.rows[0].user_id) {
        const existingUserId = existing.rows[0].user_id as string;
        const isOriginalClaimer = session && session.id === existingUserId;
        const isHostCohost = canManage(callerRole);

        if (!isOriginalClaimer && !isHostCohost) {
          return NextResponse.json({ error: 'This spot is already claimed' }, { status: 409 });
        }
      }

      // Prevent claiming a second spot — check if user already has another player in this game
      const claimUserId = body.user_id || body.claimed_by;
      if (claimUserId && session) {
        const alreadyInGame = await db.execute({
          sql: 'SELECT id FROM players WHERE game_id = ? AND user_id = ? AND id != ?',
          args: [gameId, claimUserId, id],
        });
        if (alreadyInGame.rows.length > 0 && !canManage(callerRole)) {
          return NextResponse.json({ error: 'You already have a spot in this game' }, { status: 409 });
        }
      }
    }

    // Allow claiming regardless of started state
    if (typeof body.claimed_by === 'string') {
      await db.execute({
        sql: 'UPDATE players SET claimed_by = ? WHERE id = ?',
        args: [body.claimed_by, id],
      });
    }

    if (typeof body.user_id === 'string') {
      await db.execute({
        sql: 'UPDATE players SET user_id = ? WHERE id = ?',
        args: [body.user_id, id],
      });
    }

    if (typeof body.is_playing === 'number') {
      // Host/cohost can change status even after start (for injured players)
      if (started) {
        const callerRole = await getCallerRole(gameId);
        if (!canManage(callerRole)) {
          return NextResponse.json({ error: 'Tournament has started. Cannot change player status.' }, { status: 400 });
        }
      }

      // Check if player is being set to not-playing (removed from active)
      const currentState = await db.execute({
        sql: 'SELECT is_playing, waitlist_position, role FROM players WHERE id = ?',
        args: [id],
      });

      const targetRole = currentState.rows[0]?.role as string;

      // Cannot disable the host
      if (targetRole === 'host' && !body.is_playing) {
        return NextResponse.json({ error: 'Cannot remove the host. Transfer host role first.' }, { status: 400 });
      }

      // Co-hosts cannot disable other co-hosts
      if (targetRole === 'cohost' && !body.is_playing) {
        const callerRole = await getCallerRole(gameId);
        if (callerRole === 'cohost') {
          return NextResponse.json({ error: 'Co-hosts cannot remove other co-hosts' }, { status: 403 });
        }
      }
      const wasPlaying = currentState.rows[0]?.is_playing as number;
      const wasOnWaitlist = currentState.rows[0]?.waitlist_position !== null;

      await db.execute({
        sql: 'UPDATE players SET is_playing = ? WHERE id = ?',
        args: [body.is_playing, id],
      });

      // If an active player (not waitlisted) is being set to not-playing, promote from waitlist
      if (wasPlaying && !body.is_playing && !wasOnWaitlist) {
        await promoteFromWaitlist(gameId);
      }
    }

    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      await db.execute({
        sql: 'UPDATE players SET name = ? WHERE id = ?',
        args: [body.name.trim(), id],
      });
    }

    // Division assignment
    if (body.division_id !== undefined) {
      await db.execute({
        sql: 'UPDATE players SET division_id = ? WHERE id = ?',
        args: [body.division_id, id],
      });
    }

    // Check-in
    if (typeof body.is_here === 'number') {
      await db.execute({
        sql: 'UPDATE players SET is_here = ? WHERE id = ?',
        args: [body.is_here, id],
      });
    }

    // Role change — only host can change roles
    if (typeof body.role === 'string' && ['host', 'cohost', 'player'].includes(body.role)) {
      const callerRole = await getCallerRole(gameId);
      if (callerRole !== 'host') {
        return NextResponse.json({ error: 'Only the host can change roles' }, { status: 403 });
      }

      // If transferring host role, demote current host to player
      if (body.role === 'host') {
        const session = await getSession();
        if (session) {
          await db.execute({
            sql: "UPDATE players SET role = 'player' WHERE game_id = ? AND user_id = ? AND role = 'host'",
            args: [gameId, session.id],
          });
        }
      }

      await db.execute({
        sql: 'UPDATE players SET role = ? WHERE id = ?',
        args: [body.role, id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('PATCH /api/games/[code]/players/[id] error:', e);
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

    const game = await db.execute({
      sql: 'SELECT id, started FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;

    if (game.rows.length > 0 && (game.rows[0].started as number)) {
      return NextResponse.json({ error: 'Tournament has started. Cannot remove players.' }, { status: 400 });
    }

    // Permission check: only host/cohost can remove players
    const callerRole = await getCallerRole(gameId);
    if (!canManage(callerRole)) {
      // Allow players to remove themselves
      const session = await getSession();
      const targetPlayer = await db.execute({
        sql: 'SELECT user_id FROM players WHERE id = ?',
        args: [id],
      });
      if (!session || targetPlayer.rows.length === 0 || targetPlayer.rows[0].user_id !== session.id) {
        return NextResponse.json({ error: 'Only host or co-host can remove players' }, { status: 403 });
      }
    }

    // Check if the player being deleted was active (not on waitlist)
    const player = await db.execute({
      sql: 'SELECT is_playing, waitlist_position, role FROM players WHERE id = ?',
      args: [id],
    });

    const targetRole = player.rows[0]?.role as string;

    // Cannot remove the host
    if (targetRole === 'host') {
      return NextResponse.json({ error: 'Cannot remove the host. Transfer host role first.' }, { status: 400 });
    }

    // Co-hosts cannot remove other co-hosts
    if (targetRole === 'cohost' && callerRole === 'cohost') {
      return NextResponse.json({ error: 'Co-hosts cannot remove other co-hosts' }, { status: 403 });
    }
    const wasActive = player.rows.length > 0
      && (player.rows[0].is_playing as number) === 1
      && player.rows[0].waitlist_position === null;
    const wasOnWaitlist = player.rows.length > 0 && player.rows[0].waitlist_position !== null;
    const removedWaitlistPos = wasOnWaitlist ? player.rows[0].waitlist_position as number : null;

    await db.execute({
      sql: 'DELETE FROM players WHERE id = ?',
      args: [id],
    });

    // If deleted player was active, promote from waitlist
    if (wasActive) {
      await promoteFromWaitlist(gameId);
    }

    // If deleted player was on waitlist, renumber remaining waitlist positions
    if (wasOnWaitlist && removedWaitlistPos !== null) {
      await db.execute({
        sql: `UPDATE players SET waitlist_position = waitlist_position - 1
              WHERE game_id = ? AND waitlist_position > ?`,
        args: [gameId, removedWaitlistPos],
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/games/[code]/players/[id] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
