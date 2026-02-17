import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';

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

    const teams = await db.execute({
      sql: `SELECT t.*, p1.name as player1_name, p2.name as player2_name
            FROM teams t
            JOIN players p1 ON t.player1_id = p1.id
            JOIN players p2 ON t.player2_id = p2.id
            WHERE t.game_id = ?`,
      args: [gameId],
    });

    return NextResponse.json(teams.rows);
  } catch (e: unknown) {
    console.error('GET /api/games/[code]/teams error:', e);
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
      sql: 'SELECT id, started FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.rows[0].started) {
      return NextResponse.json({ error: 'Cannot modify teams after tournament has started' }, { status: 400 });
    }

    const gameId = game.rows[0].id as string;
    const body = await request.json();
    const { player1_id, player2_id, team_name } = body;

    if (!player1_id || !player2_id) {
      return NextResponse.json({ error: 'Both player IDs are required' }, { status: 400 });
    }

    if (player1_id === player2_id) {
      return NextResponse.json({ error: 'Cannot pair a player with themselves' }, { status: 400 });
    }

    // Check if either player is already on a team
    const existing = await db.execute({
      sql: `SELECT id FROM teams WHERE game_id = ?
            AND (player1_id = ? OR player2_id = ? OR player1_id = ? OR player2_id = ?)`,
      args: [gameId, player1_id, player1_id, player2_id, player2_id],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'One or both players are already on a team' }, { status: 400 });
    }

    const id = generateId();
    await db.execute({
      sql: 'INSERT INTO teams (id, game_id, player1_id, player2_id, team_name) VALUES (?, ?, ?, ?, ?)',
      args: [id, gameId, player1_id, player2_id, team_name || null],
    });

    return NextResponse.json({ id, game_id: gameId, player1_id, player2_id, team_name: team_name || null });
  } catch (e: unknown) {
    console.error('POST /api/games/[code]/teams error:', e);
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

    const game = await db.execute({
      sql: 'SELECT id, started FROM games WHERE code = ?',
      args: [code.toUpperCase()],
    });

    if (game.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.rows[0].started) {
      return NextResponse.json({ error: 'Cannot modify teams after tournament has started' }, { status: 400 });
    }

    const body = await request.json();
    const { team_id } = body;

    if (!team_id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM teams WHERE id = ?',
      args: [team_id],
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('DELETE /api/games/[code]/teams error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
