-- Schema databaze BCprace (PostgreSQL).
-- Spusteni (PowerShell, ve slozce Rebulid01):
--   Get-Content DB\schema.sql | docker exec -i rebulid01-db psql -U bcprace -d bcprace
-- POZOR: smaze vsechny tabulky i data a vytvori je znovu. Jen pro vyvoj.

-- mazani: nejdriv tabulky, ktere odkazuji na jine
DROP TABLE IF EXISTS oauth_states;
DROP TABLE IF EXISTS strava_accounts;
DROP TABLE IF EXISTS ai_insights;
DROP TABLE IF EXISTS activity_metrics;
DROP TABLE IF EXISTS user_metrics;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS users;

-- profil uzivatele
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    avatar_url    TEXT,
    sex           TEXT,
    birth_date    DATE,
    height_cm     REAL,
    weight_kg     REAL,
    rest_hr       REAL,
    max_hr        REAL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- namerena data z treninku (nezavisle na zdroji)
CREATE TABLE activities (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source           TEXT NOT NULL,          -- file / healthkit / health_connect / strava
    external_id      TEXT NOT NULL,          -- ID aktivity ve zdroji
    sport_type       TEXT NOT NULL,          -- run / ride / strength ...
    name             TEXT,
    started_at       TIMESTAMPTZ NOT NULL,
    timezone         TEXT,
    elapsed_time_s   INTEGER,
    moving_time_s    INTEGER,
    distance_m       REAL,
    elevation_gain_m REAL,
    avg_hr           REAL,
    max_hr           REAL,
    avg_cadence      REAL,
    avg_speed_ms     REAL,
    max_speed_ms     REAL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, source, external_id)    -- opakovany import nic nezduplikuje
);

-- prihlaseni
CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- vypocitane hodnoty o uzivateli (jeden radek na uzivatele)
CREATE TABLE user_metrics (
    user_id              BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hrr                  REAL,          -- rezerva srdecni frekvence (max - klidovy tep)
    acwr                 REAL,          -- pomer akutni a chronicke zateze
    estimated_vo2max     REAL,
    estimated_vo2max_at  TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- vypocitane hodnoty k aktivite (jeden radek na aktivitu)
CREATE TABLE activity_metrics (
    activity_id      BIGINT PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    trimp            REAL,
    intensity        REAL,
    estimated_vo2    REAL,
    pace_min_per_km  REAL,
    computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- odpovedi AI (activity_id prazdne = hodnoceni celeho uzivatele)
CREATE TABLE ai_insights (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id  BIGINT REFERENCES activities(id) ON DELETE CASCADE,
    status       TEXT,
    badge        TEXT,
    headline     TEXT,
    summary      TEXT,
    effort       TEXT,          -- jen u hodnoceni behu: lehke / stredni / tezke
    risks        JSONB,
    actions      JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== DOCASNE: prihlaseni pres Stravu. Smaze se, az Stravu odstranime (krok 0). =====

-- propojeni uzivatele se Strava uctem (tokeny se pri odhlaseni vymazou, propojeni zustane)
CREATE TABLE strava_accounts (
    user_id        BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    athlete_id     BIGINT NOT NULL UNIQUE,
    access_token   TEXT,
    refresh_token  TEXT,
    expires_at     BIGINT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ochrana prihlaseni (OAuth state)
CREATE TABLE oauth_states (
    state       TEXT PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
