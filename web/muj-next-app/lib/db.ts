import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), "strava.sqlite");

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS strava_tokens (
    athlete_id INTEGER PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    user_id INTEGER NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    profile_medium TEXT,
    strava_athlete_id INTEGER UNIQUE,
    username TEXT NOT NULL UNIQUE,
    sex TEXT,
    height_cm REAL,
    birth_date TEXT,
    weight_kg REAL,
    rest_heartrate REAL,
    max_heartrate_calculated REAL,
    hrr REAL,
    awrs REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)
    `);


db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
    )
    `);

db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    distance REAL,
    moving_time INTEGER,
    elapsed_time INTEGER,
    type TEXT,
    start_date TEXT,
    average_cadence REAL,
    average_speed REAL,
    max_speed REAL,
    average_heartrate REAL,
    max_heartrate REAL,
    intensity REAL,
    trimp REAL,
    Avg_speed REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
    )
    `);


    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);



try {
  db.exec(`
ALTER TABLE activities ADD COLUMN Avg_speed REAL
  `);
} catch (error) {
  console.log("Avg_speed existuje");
}

