import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  if (process.env.TURSO_DATABASE_URL) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    // Local development: use a local SQLite file
    client = createClient({
      url: 'file:local.db',
    });
  }

  return client;
}

let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;

  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      num_courts INTEGER NOT NULL,
      mode TEXT NOT NULL DEFAULT 'rotating',
      schedule_generated INTEGER NOT NULL DEFAULT 0,
      started INTEGER NOT NULL DEFAULT 0,
      num_rounds INTEGER,
      scheduled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_playing INTEGER NOT NULL DEFAULT 1,
      order_num INTEGER NOT NULL DEFAULT 0,
      claimed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      court_number INTEGER NOT NULL,
      team1_player1_id TEXT NOT NULL REFERENCES players(id),
      team1_player2_id TEXT NOT NULL REFERENCES players(id),
      team2_player1_id TEXT NOT NULL REFERENCES players(id),
      team2_player2_id TEXT NOT NULL REFERENCES players(id),
      team1_score INTEGER,
      team2_score INTEGER,
      is_completed INTEGER NOT NULL DEFAULT 0
    );
  `);

  initialized = true;
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateId(): string {
  return crypto.randomUUID();
}
