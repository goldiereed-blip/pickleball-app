import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getCallerRole, canManage } from '@/lib/api-permissions';
import { getActivePlayerCount, getNextWaitlistPosition } from '@/lib/waitlist';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const { code } = params;

    const game = await db.execute({
      sql: 'SELECT id FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;

    const players = await db.execute({
      sql: 'SELECT * FROM players WHERE game_id = ? ORDER BY waitlist_position IS NOT NULL, waitlist_position ASC, order_num ASC, created_at ASC',
      args: [gameId],
    });

    return NextResponse.json(players.rows);
  } catch (e: unknown) {
    console.error('GET /api/games/[code]/players error:', e);
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

    const game = await db.execute({
      sql: 'SELECT id, started, created_by, max_players FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameId = game.rows[0].id as string;
    const started = game.rows[0].started as number;
    const createdBy = game.rows[0].created_by as string | null;
    const maxPlayers = (game.rows[0].max_players as number) || 48;

    if (started) {
      return NextResponse.json({ error: 'Tournament has started. Cannot add players.' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    // Prevent duplicate spots — but only when a player is joining for themselves
    // Hosts/co-hosts adding players on behalf of others should not be blocked
    const user = await getSession();
    if (user) {
      const callerRole = await getCallerRole(gameId);
      if (!canManage(callerRole)) {
        const existingPlayer = await db.execute({
          sql: 'SELECT id FROM players WHERE game_id = ? AND user_id = ?',
          args: [gameId, user.id],
        });
        if (existingPlayer.rows.length > 0) {
          return NextResponse.json({ error: 'You already have a spot in this game' }, { status: 409 });
        }
      }
    }

    // Check total player count (active + waitlist)
    const totalCount = await db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM players WHERE game_id = ?',
      args: [gameId],
    });
    const currentTotal = totalCount.rows[0].cnt as number;

    if (currentTotal >= 48) {
      return NextResponse.json({ error: 'Maximum 48 players reached' }, { status: 400 });
    }

    const id = generateId();

    // Auto-assign host role if the current user is the game creator
    let role = 'player';
    if (user && createdBy && user.id === createdBy) {
      const existingHost = await db.execute({
        sql: "SELECT id FROM players WHERE game_id = ? AND role = 'host'",
        args: [gameId],
      });
      if (existingHost.rows.length === 0) {
        role = 'host';
      }
    }

    // Determine if player goes to active roster or waitlist
    const activeCount = await getActivePlayerCount(gameId);
    let waitlistPosition: number | null = null;
    let isPlaying = 1;

    if (activeCount >= maxPlayers) {
      // Game is full — add to waitlist
      waitlistPosition = await getNextWaitlistPosition(gameId);
      isPlaying = 0;
    }

    await db.execute({
      sql: 'INSERT INTO players (id, game_id, name, is_playing, order_num, role, waitlist_position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, gameId, name.trim(), isPlaying, currentTotal, role, waitlistPosition],
    });

    return NextResponse.json({
      id, game_id: gameId, name: name.trim(), is_playing: isPlaying,
      order_num: currentTotal, role, division_id: null, is_here: 0,
      waitlist_position: waitlistPosition,
    });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/players error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
