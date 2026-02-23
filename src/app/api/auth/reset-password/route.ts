import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const { token, password, password_confirm } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (password_confirm !== undefined && password !== password_confirm) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    // Find valid token
    const result = await db.execute({
      sql: `SELECT id, user_id FROM password_reset_tokens
            WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
      args: [token],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const tokenId = result.rows[0].id as string;
    const userId = result.rows[0].user_id as string;

    // Hash new password and update user
    const passwordHash = await hashPassword(password);
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [passwordHash, userId],
    });

    // Mark token as used
    await db.execute({
      sql: 'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
      args: [tokenId],
    });

    // Delete all sessions for this user (force re-login)
    await db.execute({
      sql: 'DELETE FROM sessions WHERE user_id = ?',
      args: [userId],
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (e: unknown) {
    console.error('POST /api/auth/reset-password error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
