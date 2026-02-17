import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, generateId } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const body = await request.json();
    const { email, password, display_name } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json({ error: 'Email, password, and display name are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);

    await db.execute({
      sql: 'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      args: [id, email.toLowerCase().trim(), passwordHash, display_name.trim()],
    });

    const sessionId = await createSession(id);

    const response = NextResponse.json({
      user: { id, email: email.toLowerCase().trim(), display_name: display_name.trim() },
    });

    response.cookies.set('pb_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (e: unknown) {
    console.error('POST /api/auth/register error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
