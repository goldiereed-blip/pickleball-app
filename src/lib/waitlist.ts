import { getDb } from './db';

/**
 * Promote the first person on the waitlist to active status.
 * Called after an active player is removed or set to not playing.
 */
export async function promoteFromWaitlist(gameId: string): Promise<void> {
  const db = getDb();

  // Find the first waitlisted player (lowest waitlist_position)
  const waitlisted = await db.execute({
    sql: `SELECT id, waitlist_position FROM players
          WHERE game_id = ? AND waitlist_position IS NOT NULL
          ORDER BY waitlist_position ASC LIMIT 1`,
    args: [gameId],
  });

  if (waitlisted.rows.length === 0) return;

  const promotedId = waitlisted.rows[0].id as string;

  // Promote: set is_playing = 1, clear waitlist_position
  await db.execute({
    sql: 'UPDATE players SET is_playing = 1, waitlist_position = NULL WHERE id = ?',
    args: [promotedId],
  });

  // Renumber remaining waitlist positions (shift down by 1)
  await db.execute({
    sql: `UPDATE players SET waitlist_position = waitlist_position - 1
          WHERE game_id = ? AND waitlist_position IS NOT NULL`,
    args: [gameId],
  });
}

/**
 * Get the count of active (non-waitlisted) players in a game.
 */
export async function getActivePlayerCount(gameId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM players WHERE game_id = ? AND waitlist_position IS NULL AND is_playing = 1',
    args: [gameId],
  });
  return result.rows[0].cnt as number;
}

/**
 * Get the max waitlist position (next position for new waitlister).
 */
export async function getNextWaitlistPosition(gameId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT MAX(waitlist_position) as max_pos FROM players WHERE game_id = ? AND waitlist_position IS NOT NULL',
    args: [gameId],
  });
  const maxPos = result.rows[0].max_pos;
  return maxPos !== null ? (maxPos as number) + 1 : 1;
}
