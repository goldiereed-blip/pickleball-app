import { getDb } from './db';
import { getSession } from './auth';
import type { PlayerRole } from './types';

export async function getCallerRole(gameId: string): Promise<PlayerRole | null> {
  const db = getDb();
  const user = await getSession();

  if (!user) return null;

  // Check if user is a player in this game
  const playerResult = await db.execute({
    sql: 'SELECT role FROM players WHERE game_id = ? AND user_id = ?',
    args: [gameId, user.id],
  });

  if (playerResult.rows.length > 0) {
    return playerResult.rows[0].role as PlayerRole;
  }

  // Fallback: check if user is game creator (implicit host)
  const gameResult = await db.execute({
    sql: 'SELECT created_by FROM games WHERE id = ?',
    args: [gameId],
  });

  if (gameResult.rows.length > 0 && gameResult.rows[0].created_by === user.id) {
    return 'host';
  }

  return null;
}

export function canManage(role: PlayerRole | null): boolean {
  return role === 'host' || role === 'cohost';
}
