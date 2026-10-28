import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent','child')),
  color TEXT NOT NULL DEFAULT '#4f7cff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

-- Beløb gemmes i øre for at undgå afrundingsfejl.
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reward INTEGER NOT NULL DEFAULT 0,
  assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
  repeat TEXT NOT NULL DEFAULT 'once' CHECK (repeat IN ('once','daily','weekly')),
  active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  amount INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_completions_task ON task_completions(task_id, user_id, period);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('earned','payout','bonus','adjust')),
  amount INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  completion_id INTEGER REFERENCES task_completions(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 4,
  instructions TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_sections (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meal_plan (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  servings INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_plan_date ON meal_plan(date);

CREATE TABLE IF NOT EXISTS shopping_checks (
  list_key TEXT NOT NULL,
  item_key TEXT NOT NULL,
  PRIMARY KEY (list_key, item_key)
);

-- Varer fra madplanen, som familien allerede har hjemme, og som derfor er fjernet fra ugens liste.
CREATE TABLE IF NOT EXISTS shopping_hidden (
  list_key TEXT NOT NULL,
  item_key TEXT NOT NULL,
  PRIMARY KEY (list_key, item_key)
);

CREATE TABLE IF NOT EXISTS shopping_extra (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT NOT NULL DEFAULT '',
  checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(starts_at);

-- Husker, hvilken butikskategori en vare er flyttet til (navn i små bogstaver).
CREATE TABLE IF NOT EXISTS item_categories (
  name_key TEXT PRIMARY KEY,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __familieDb: Database.Database | undefined;
}

export function openDb(file?: string): Database.Database {
  const target = file ?? path.join(dataDir, "familie.db");
  if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(schema);
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  const has = (table: string, column: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
  if (!has("tasks", "times_per_week")) db.exec("ALTER TABLE tasks ADD COLUMN times_per_week INTEGER NOT NULL DEFAULT 1");
  if (!has("recipe_ingredients", "section_id")) {
    db.exec("ALTER TABLE recipe_ingredients ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE");
  }
  if (!has("task_completions", "completed_on")) {
    db.exec("ALTER TABLE task_completions ADD COLUMN completed_on TEXT");
    db.exec("UPDATE task_completions SET completed_on = substr(completed_at, 1, 10) WHERE completed_on IS NULL");
  }
}

export function db(): Database.Database {
  if (!globalThis.__familieDb) globalThis.__familieDb = openDb();
  return globalThis.__familieDb;
}

export function getSetting(key: string): string | undefined {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function calendarToken(): string {
  let token = getSetting("calendar_token");
  if (!token) {
    token = crypto.randomBytes(24).toString("base64url");
    setSetting("calendar_token", token);
  }
  return token;
}
