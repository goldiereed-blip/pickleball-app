import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const result = await db.execute({
      sql: 'SELECT id, display_name FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (result.rows.length > 0) {
      const userId = result.rows[0].id as string;
      const displayName = result.rows[0].display_name as string;
      const token = crypto.randomUUID();
      const id = generateId();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await db.execute({
        sql: 'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        args: [id, userId, token, expiresAt],
      });

      try {
        await sendPasswordResetEmail(email.toLowerCase().trim(), displayName, token);
      } catch (emailErr) {
        console.error('Failed to send password reset email:', emailErr);
      }
    }

    return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (e: unknown) {
    console.error('POST /api/auth/forgot-password error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
