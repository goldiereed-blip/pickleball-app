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

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      num_courts INTEGER NOT NULL,
      mode TEXT NOT NULL DEFAULT 'rotating',
      schedule_generated INTEGER NOT NULL DEFAULT 0,
      started INTEGER NOT NULL DEFAULT 0,
      is_complete INTEGER NOT NULL DEFAULT 0,
      num_rounds INTEGER,
      scheduled_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_playing INTEGER NOT NULL DEFAULT 1,
      order_num INTEGER NOT NULL DEFAULT 0,
      claimed_by TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      player1_id TEXT NOT NULL REFERENCES players(id),
      player2_id TEXT NOT NULL REFERENCES players(id),
      team_name TEXT
    )`,
    args: [],
  });

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL
    )`,
    args: [],
  });

  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS matches (
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
    )`,
    args: [],
  });

  // Divisions table
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      court_start INTEGER NOT NULL,
      court_end INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '#854AAF',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  // Idempotent column migrations via try/catch
  const alterStatements = [
    'ALTER TABLE games ADD COLUMN num_rounds INTEGER',
    'ALTER TABLE games ADD COLUMN scheduled_at TEXT',
    'ALTER TABLE games ADD COLUMN created_by TEXT',
    'ALTER TABLE games ADD COLUMN is_complete INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE players ADD COLUMN claimed_by TEXT',
    'ALTER TABLE players ADD COLUMN user_id TEXT',
    'ALTER TABLE players ADD COLUMN division_id TEXT',
    'ALTER TABLE players ADD COLUMN is_here INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE players ADD COLUMN role TEXT NOT NULL DEFAULT 'player'",
    'ALTER TABLE rounds ADD COLUMN division_id TEXT',
    'ALTER TABLE matches ADD COLUMN division_id TEXT',
  ];
  for (const sql of alterStatements) {
    try {
      await db.execute({ sql, args: [] });
    } catch {
      // Column already exists — ignore
    }
  }

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
