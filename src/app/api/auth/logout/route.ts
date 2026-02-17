import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { deleteSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const sessionId = request.cookies.get('pb_session')?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('pb_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (e: unknown) {
    console.error('POST /api/auth/logout error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
