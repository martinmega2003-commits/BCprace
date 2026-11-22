-- Schema databaze BCprace (PostgreSQL).
-- Spusteni (PowerShell, ve slozce Rebulid01):
--   Get-Content DB\schema.sql | docker exec -i rebulid01-db psql -U bcprace -d bcprace
-- POZOR: smaze vsechny tabulky i data a vytvori je znovu. Jen pro vyvoj.

-- mazani: nejdriv tabulky, ktere odkazuji na jine
-- (oauth_states a strava_accounts uz neexistuji, mazou se jen ze starsich databazi,
--  jinak by DROP TABLE users selhal, protoze strava_accounts na users odkazuje)
DROP TABLE IF EXISTS oauth_states;
DROP TABLE IF EXISTS strava_accounts;
DROP TABLE IF EXISTS ai_insights;
DROP TABLE IF EXISTS activity_metrics;
DROP TABLE IF EXISTS user_metrics;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS activity_points;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;

-- profil uzivatele
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    -- e-mail vzdy malymi pismeny ("Martin@Test.cz" a "martin@test.cz" je stejny ucet), CHECK to pohlida
    email         TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
    -- NIKDY ne heslo samotne, jen jeho hash (argon2id)
    password_hash TEXT NOT NULL,
    -- co smi: kazdy novy ucet je 'user', admina nastavujes rucne v DB
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified_at TIMESTAMPTZ,
    username      TEXT NOT NULL,             -- zobrazovane jmeno (muze byt stejne u vic lidi)
    avatar_url    TEXT,
    sex           TEXT,
    birth_date    DATE,
    height_cm     DOUBLE PRECISION,
    weight_kg     DOUBLE PRECISION,
    rest_hr       DOUBLE PRECISION,
    max_hr        DOUBLE PRECISION,
    body_fat_pct  DOUBLE PRECISION,          -- procento tuku (vahy s mericim tuku)
    hrv_ms        DOUBLE PRECISION,          -- variabilita srdecni frekvence (SDNN), ukazatel regenerace
    vo2max_apple  DOUBLE PRECISION,          -- odhad VO2max od Apple (pro srovnani s nasim estimated_vo2max)
    profile_synced_at TIMESTAMPTZ,           -- kdy byly udaje naposledy nacteny z Apple Health / Health Connect
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- overeni e-mailu: odkaz v e-mailu nese nahodny token, v DB je jen jeho hash
CREATE TABLE email_verifications (
    token_hash  TEXT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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
    distance_m       DOUBLE PRECISION,
    elevation_gain_m DOUBLE PRECISION,
    avg_hr           DOUBLE PRECISION,
    max_hr           DOUBLE PRECISION,
    avg_cadence      DOUBLE PRECISION,
    avg_speed_ms     DOUBLE PRECISION,
    max_speed_ms     DOUBLE PRECISION,
    calories_kcal    DOUBLE PRECISION,       -- aktivni spalene kalorie
    is_indoor        BOOLEAN,                -- beh na pasu / indoor (NULL = nevime)
    source_app       TEXT,                   -- aplikace, ktera trenink zapsala (napr. "Garmin Connect") -> hledani duplicit
    device_name      TEXT,                   -- zarizeni, ktere meralo (napr. "Apple Watch")
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, source, external_id)    -- opakovany import nic nezduplikuje
);

-- body trasy behu zaznamenaneho v appce (jen body, ktere prosly filtrem)
CREATE TABLE activity_points (
    activity_id  BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    seq          INTEGER NOT NULL,              -- poradi bodu 0, 1, 2...
    recorded_at  TIMESTAMPTZ NOT NULL,
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    accuracy_m   DOUBLE PRECISION,
    segment      INTEGER NOT NULL DEFAULT 0,    -- po kazde pauze +1
    PRIMARY KEY (activity_id, seq)
);

-- prihlaseni (jeden radek = jedno prihlasene zarizeni)
CREATE TABLE sessions (
    -- klient dostane nahodny token, v DB je jen jeho hash (SHA-256)
    -- -> kdyby databaze unikla, z hashe se token ziskat neda
    token_hash  TEXT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- rychle hledani vsech sessions uzivatele (napr. "odhlasit ze vsech zarizeni")
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- ochrana prihlaseni: zaznam kazdeho pokusu (podle nej omezime hadani hesla)
CREATE TABLE login_attempts (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL,             -- i neexistujici e-mail (utocnik zkousi ucty)
    ip            TEXT NOT NULL,
    success       BOOLEAN NOT NULL,
    attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_idx ON login_attempts (email, attempted_at);
CREATE INDEX login_attempts_ip_idx ON login_attempts (ip, attempted_at);

-- vypocitane hodnoty o uzivateli (jeden radek na uzivatele)
CREATE TABLE user_metrics (
    user_id              BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hrr                  DOUBLE PRECISION,          -- rezerva srdecni frekvence (max - klidovy tep)
    acwr                 DOUBLE PRECISION,          -- pomer akutni a chronicke zateze
    estimated_vo2max     DOUBLE PRECISION,
    estimated_vo2max_at  TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- vypocitane hodnoty k aktivite (jeden radek na aktivitu)
CREATE TABLE activity_metrics (
    activity_id      BIGINT PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    trimp            DOUBLE PRECISION,
    intensity        DOUBLE PRECISION,
    estimated_vo2    DOUBLE PRECISION,
    pace_min_per_km  DOUBLE PRECISION,
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
