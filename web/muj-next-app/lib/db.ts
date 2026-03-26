import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "strava.sqlite");

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
    birth_year INTEGER,
    weight_kg REAL,
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
    )
    `);



try {
  db.exec(`
    ALTER TABLE users ADD COLUMN profile_medium TEXT
  `);
} catch (error) {
  console.log("profile_medium already exists");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN sex TEXT
  `);
} catch (error) {
  console.log("sex already exists");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN height_cm REAL
  `);
} catch (error) {
  console.log("height_cm already exists");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN birth_year INTEGER
  `);
} catch (error) {
  console.log("birth_year already exists");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN weight_kg REAL
  `);
} catch (error) {
  console.log("weight_kg already exists");
}
