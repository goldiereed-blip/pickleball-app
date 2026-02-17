import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    await initDb();
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (e: unknown) {
    console.error('GET /api/auth/me error:', e);
    return NextResponse.json({ user: null });
  }
}
