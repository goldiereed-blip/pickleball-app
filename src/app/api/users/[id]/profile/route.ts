import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const session = await getSession();

    if (!session || session.id !== params.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update name
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const firstName = (body.first_name ?? session.first_name).trim();
      const lastName = (body.last_name ?? session.last_name).trim();

      if (!firstName || !lastName) {
        return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
      }

      const displayName = `${firstName} ${lastName}`;
      await db.execute({
        sql: 'UPDATE users SET first_name = ?, last_name = ?, display_name = ? WHERE id = ?',
        args: [firstName, lastName, displayName, params.id],
      });
    }

    // Update email
    if (body.email !== undefined) {
      const newEmail = body.email.toLowerCase().trim();
      if (!newEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Check uniqueness
      const existing = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
        args: [newEmail, params.id],
      });
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
      }

      await db.execute({
        sql: 'UPDATE users SET email = ? WHERE id = ?',
        args: [newEmail, params.id],
      });
    }

    // Update password
    if (body.new_password) {
      if (!body.current_password) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }

      const user = await db.execute({
        sql: 'SELECT password_hash FROM users WHERE id = ?',
        args: [params.id],
      });

      const valid = await verifyPassword(body.current_password, user.rows[0].password_hash as string);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      if (body.new_password.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      if (body.new_password_confirm && body.new_password !== body.new_password_confirm) {
        return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
      }

      const hash = await hashPassword(body.new_password);
      await db.execute({
        sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
        args: [hash, params.id],
      });
    }

    // Fetch updated user
    const updated = await db.execute({
      sql: 'SELECT id, email, display_name, first_name, last_name, created_at FROM users WHERE id = ?',
      args: [params.id],
    });

    return NextResponse.json({
      user: {
        id: updated.rows[0].id,
        email: updated.rows[0].email,
        display_name: updated.rows[0].display_name,
        first_name: updated.rows[0].first_name || '',
        last_name: updated.rows[0].last_name || '',
        created_at: updated.rows[0].created_at,
      },
    });
  } catch (e: unknown) {
    console.error('PATCH /api/users/[id]/profile error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
