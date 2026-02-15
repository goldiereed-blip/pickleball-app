import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';
import { generateRotatingSchedule, generateFixedSchedule } from '@/lib/scheduler';
import type { Game, Player } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  await initDb();
  const db = getDb();
  const { code } = params;

  const game = await db.execute({
    sql: 'SELECT * FROM games WHERE code = ?',
    args: [code.toUpperCase()],
  });

  if (game.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const gameId = game.rows[0].id as string;

  const rounds = await db.execute({
    sql: 'SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number ASC',
    args: [gameId],
  });

  const result = [];

  for (const round of rounds.rows) {
    const matches = await db.execute({
      sql: `SELECT m.*,
            p1.name as team1_player1_name,
            p2.name as team1_player2_name,
            p3.name as team2_player1_name,
            p4.name as team2_player2_name
           FROM matches m
           JOIN players p1 ON m.team1_player1_id = p1.id
           JOIN players p2 ON m.team1_player2_id = p2.id
           JOIN players p3 ON m.team2_player1_id = p3.id
           JOIN players p4 ON m.team2_player2_id = p4.id
           WHERE m.round_id = ?
           ORDER BY m.court_number ASC`,
      args: [round.id as string],
    });

    // Find who is sitting out: players not in any match this round
    const playingIds = new Set<string>();
    for (const m of matches.rows) {
      playingIds.add(m.team1_player1_id as string);
      playingIds.add(m.team1_player2_id as string);
      playingIds.add(m.team2_player1_id as string);
      playingIds.add(m.team2_player2_id as string);
    }

    const allPlayers = await db.execute({
      sql: 'SELECT id, name FROM players WHERE game_id = ? AND is_playing = 1',
      args: [gameId],
    });

    const sitting = allPlayers.rows
      .filter((p) => !playingIds.has(p.id as string))
      .map((p) => p.name as string);

    result.push({
      round_number: round.round_number,
      round_id: round.id,
      matches: matches.rows.map((m) => ({
        ...m,
        round_number: round.round_number,
      })),
      sitting,
    });
  }

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  await initDb();
  const db = getDb();
  const { code } = params;

  const gameResult = await db.execute({
    sql: 'SELECT * FROM games WHERE code = ?',
    args: [code.toUpperCase()],
  });

  if (gameResult.rows.length === 0) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const game = gameResult.rows[0] as unknown as Game;

  // Get active players
  const playersResult = await db.execute({
    sql: 'SELECT * FROM players WHERE game_id = ? AND is_playing = 1 ORDER BY order_num ASC',
    args: [game.id],
  });

  const players = playersResult.rows as unknown as Player[];

  if (players.length < 4) {
    return NextResponse.json(
      { error: 'Need at least 4 active players to generate a schedule' },
      { status: 400 }
    );
  }

  if (game.mode === 'fixed' && players.length % 2 !== 0) {
    return NextResponse.json(
      { error: 'Fixed partners mode requires an even number of players' },
      { status: 400 }
    );
  }

  // Delete existing schedule
  await db.execute({
    sql: 'DELETE FROM matches WHERE game_id = ?',
    args: [game.id],
  });
  await db.execute({
    sql: 'DELETE FROM rounds WHERE game_id = ?',
    args: [game.id],
  });

  // Check for num_rounds limit from request body or game setting
  let numRoundsLimit: number | null = null;
  try {
    const body = await request.json();
    if (typeof body.num_rounds === 'number' && body.num_rounds > 0) {
      numRoundsLimit = body.num_rounds;
    }
  } catch {
    // No body provided, use game setting
  }
  if (!numRoundsLimit && game.num_rounds) {
    numRoundsLimit = game.num_rounds as unknown as number;
  }

  // Generate schedule
  const playerIds = players.map((p) => p.id);
  let schedule =
    game.mode === 'rotating'
      ? generateRotatingSchedule(playerIds, game.num_courts)
      : generateFixedSchedule(playerIds, game.num_courts);

  // Limit rounds if specified
  if (numRoundsLimit && schedule.length > numRoundsLimit) {
    schedule = schedule.slice(0, numRoundsLimit);
    // Re-number rounds
    schedule.forEach((r, i) => { r.roundNumber = i + 1; });
  }

  // Save to database
  for (const round of schedule) {
    const roundId = generateId();
    await db.execute({
      sql: 'INSERT INTO rounds (id, game_id, round_number) VALUES (?, ?, ?)',
      args: [roundId, game.id, round.roundNumber],
    });

    for (const match of round.matches) {
      const matchId = generateId();
      await db.execute({
        sql: `INSERT INTO matches (id, round_id, game_id, court_number,
              team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          matchId,
          roundId,
          game.id,
          match.court,
          match.team1[0],
          match.team1[1],
          match.team2[0],
          match.team2[1],
        ],
      });
    }
  }

  // Mark schedule as generated
  await db.execute({
    sql: 'UPDATE games SET schedule_generated = 1 WHERE id = ?',
    args: [game.id],
  });

  return NextResponse.json({ rounds: schedule.length, message: 'Schedule generated' });
}
