import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  await initDb();
  const db = getDb();
  const { id } = params;

  const body = await request.json();
  const { team1_score, team2_score } = body;

  if (
    typeof team1_score !== 'number' ||
    typeof team2_score !== 'number' ||
    team1_score < 0 ||
    team2_score < 0
  ) {
    return NextResponse.json({ error: 'Invalid scores' }, { status: 400 });
  }

  await db.execute({
    sql: `UPDATE matches SET team1_score = ?, team2_score = ?, is_completed = 1 WHERE id = ?`,
    args: [team1_score, team2_score, id],
  });

  return NextResponse.json({ success: true });
}
