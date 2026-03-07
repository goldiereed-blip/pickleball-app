import { getDb } from './db';
import { getSession } from './auth';
import type { GroupRole } from './types';

export async function getGroupRole(groupId: string): Promise<GroupRole | null> {
  const db = getDb();
  const user = await getSession();

  if (!user) return null;

  const result = await db.execute({
    sql: 'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
    args: [groupId, user.id],
  });

  if (result.rows.length > 0) {
    return result.rows[0].role as GroupRole;
  }

  return null;
}

export function isGroupAdmin(role: GroupRole | null): boolean {
  return role === 'admin';
}
