import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getCallerRole, canManage } from '@/lib/api-permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const game = await db.execute({
      sql: 'SELECT id, max_players FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const maxPlayers = (game.rows[0].max_players as number) || 48;

    const callerRole = await getCallerRole(gameId);
    if (!canManage(callerRole)) {
      return NextResponse.json({ error: 'Only host or co-host can approve waitlist' }, { status: 403 });
    }

    const body = await request.json();

    if (body.all) {
      // Approve all waitlisted players
      const waitlisted = await db.execute({
        sql: `SELECT id FROM players WHERE game_id = ? AND waitlist_position IS NOT NULL ORDER BY waitlist_position ASC`,
        args: [gameId],
      });

      if (waitlisted.rows.length === 0) {
        return NextResponse.json({ error: 'No players on waitlist' }, { status: 400 });
      }

      // Increase max_players to fit everyone
      const newMax = Math.min(48, maxPlayers + waitlisted.rows.length);
      await db.execute({
        sql: 'UPDATE games SET max_players = ? WHERE id = ?',
        args: [newMax, gameId],
      });

      // Promote all: set is_playing = 1, clear waitlist_position
      await db.execute({
        sql: `UPDATE players SET is_playing = 1, waitlist_position = NULL
              WHERE game_id = ? AND waitlist_position IS NOT NULL`,
        args: [gameId],
      });

      return NextResponse.json({ success: true, promoted: waitlisted.rows.length });
    }

    if (body.player_id) {
      // Approve a specific waitlisted player
      const player = await db.execute({
        sql: 'SELECT id, waitlist_position FROM players WHERE id = ? AND game_id = ?',
        args: [body.player_id, gameId],
      });

      if (player.rows.length === 0) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      if (player.rows[0].waitlist_position === null) {
        return NextResponse.json({ error: 'Player is not on the waitlist' }, { status: 400 });
      }

      const removedPosition = player.rows[0].waitlist_position as number;

      // Increase max_players by 1
      const newMax = Math.min(48, maxPlayers + 1);
      await db.execute({
        sql: 'UPDATE games SET max_players = ? WHERE id = ?',
        args: [newMax, gameId],
      });

      // Promote this player
      await db.execute({
        sql: 'UPDATE players SET is_playing = 1, waitlist_position = NULL WHERE id = ?',
        args: [body.player_id],
      });

      // Renumber remaining waitlist positions
      await db.execute({
        sql: `UPDATE players SET waitlist_position = waitlist_position - 1
              WHERE game_id = ? AND waitlist_position > ?`,
        args: [gameId, removedPosition],
      });

      return NextResponse.json({ success: true, promoted: 1 });
    }

    return NextResponse.json({ error: 'Provide player_id or all: true' }, { status: 400 });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/waitlist error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
