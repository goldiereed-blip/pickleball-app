import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb, generateId } from './db';
import type { User } from './types';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  await db.execute({
    sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    args: [sessionId, userId, expiresAt],
  });

  return sessionId;
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('pb_session');
    if (!sessionCookie) return null;

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT u.id, u.email, u.display_name, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.expires_at > datetime('now')`,
      args: [sessionCookie.value],
    });

    if (result.rows.length === 0) return null;

    return {
      id: result.rows[0].id as string,
      email: result.rows[0].email as string,
      display_name: result.rows[0].display_name as string,
      created_at: result.rows[0].created_at as string,
    };
  } catch {
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    args: [sessionId],
  });
}
