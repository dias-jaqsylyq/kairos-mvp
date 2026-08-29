import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH ?? "./kairos.db";
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbPath);

  // WAL lets readers and writers work concurrently; the default journal mode
  // takes a lock that can reject a write while a read is in flight.
  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA synchronous = NORMAL;");

  // Verify it actually engaged — some network filesystems silently refuse WAL
  // and fall back to 'delete'. Check the log line on first boot.
  console.log("journal_mode:", dbInstance.pragma("journal_mode", { simple: true }));

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id     TEXT PRIMARY KEY,
      skills      TEXT NOT NULL,      -- comma-separated, lowercased
      interests   TEXT NOT NULL,
      location    TEXT,
      remote_pref TEXT,               -- 'remote' | 'onsite' | 'any'
      education   TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      action         TEXT NOT NULL,   -- view | save | dismiss | apply_click
      score          INTEGER,         -- the score shown at the time
      position       INTEGER,         -- rank in the feed, 1-based
      created_at     TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return dbInstance;
}
