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
    estimated_vo2max REAL,
    estimated_vo2max_updated_at TEXT,
    ai_status TEXT,
    ai_badge TEXT,
    ai_headline TEXT,
    ai_summary TEXT,
    ai_risks TEXT,
    ai_actions TEXT,
    ai_updated_at TEXT,
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
    Elevation INTEGER,
    estimated_vo2 REAL,
    ai_badge TEXT,
    ai_headline TEXT,
    ai_summary TEXT,
    ai_effort TEXT,
    ai_risks TEXT,
    ai_actions TEXT,
    ai_updated_at TEXT,
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
    ALTER TABLE activities ADD COLUMN estimated_vo2 REAL
  `);
} catch (error) {
  console.log("estimated_vo2max existuje");
}



try {
  db.exec(`
    ALTER TABLE users ADD COLUMN estimated_vo2max REAL
  `);
} catch (error) {
  console.log("estimated_vo2max existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN estimated_vo2max_updated_at TEXT
  `);
} catch (error) {
  console.log("estimated_vo2max_updated_at existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_status TEXT
  `);
} catch (error) {
  console.log("users.ai_status existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_badge TEXT
  `);
} catch (error) {
  console.log("users.ai_badge existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_headline TEXT
  `);
} catch (error) {
  console.log("users.ai_headline existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_summary TEXT
  `);
} catch (error) {
  console.log("users.ai_summary existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_risks TEXT
  `);
} catch (error) {
  console.log("users.ai_risks existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_actions TEXT
  `);
} catch (error) {
  console.log("users.ai_actions existuje");
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN ai_updated_at TEXT
  `);
} catch (error) {
  console.log("users.ai_updated_at existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_badge TEXT
  `);
} catch (error) {
  console.log("activities.ai_badge existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_headline TEXT
  `);
} catch (error) {
  console.log("activities.ai_headline existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_summary TEXT
  `);
} catch (error) {
  console.log("activities.ai_summary existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_effort TEXT
  `);
} catch (error) {
  console.log("activities.ai_effort existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_risks TEXT
  `);
} catch (error) {
  console.log("activities.ai_risks existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_actions TEXT
  `);
} catch (error) {
  console.log("activities.ai_actions existuje");
}

try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN ai_updated_at TEXT
  `);
} catch (error) {
  console.log("activities.ai_updated_at existuje");
}


try {
  db.exec(`
    ALTER TABLE activities ADD COLUMN Elevation INTEGER
  `);
} catch (error) {
  console.log("Elevation existuje");
}
