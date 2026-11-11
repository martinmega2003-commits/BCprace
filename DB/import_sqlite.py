"""Jednorazovy import starych dat ze SQLite (data/strava.sqlite) do PostgreSQL.

Spusteni (PowerShell, ve slozce Rebulid01, databaze musi bezet):
  docker run --rm --network rebulid01_rebulid01-network -v "${PWD}:/work" -w /work `
    -e DATABASE_URL=postgresql://bcprace:bcprace_local@db:5432/bcprace `
    python:3.13-slim sh -c "pip install -q 'psycopg[binary]' && python DB/import_sqlite.py"

Skript lze spoustet opakovane: diky UNIQUE omezenim nic nezduplikuje.
"""

import json
import os
import sqlite3

import psycopg

SQLITE_PATH = os.environ.get("SQLITE_PATH", "data/strava.sqlite")
DATABASE_URL = os.environ["DATABASE_URL"]
# volitelne: importovat jen jednoho uzivatele (napr. do verejne databaze v Azure jen vlastni data)
ONLY_USERNAME = os.environ.get("ONLY_USERNAME")


def as_json(text):
    """AI rizika/akce jsou v SQLite ulozena jako JSON text -> prevest na seznam."""
    if not text:
        return None
    try:
        return json.dumps(json.loads(text))
    except json.JSONDecodeError:
        return json.dumps([text])


def main():
    src = sqlite3.connect(SQLITE_PATH)
    src.row_factory = sqlite3.Row

    with psycopg.connect(DATABASE_URL) as pg:
        user_ids = {}  # stare id ze SQLite -> nove id v PostgreSQL

        # --- uzivatele ---
        for u in src.execute("SELECT * FROM users"):
            if ONLY_USERNAME and u["username"] != ONLY_USERNAME:
                continue
            row = pg.execute(
                """
                INSERT INTO users (username, avatar_url, sex, birth_date, height_cm, weight_kg, rest_hr, max_hr)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
                RETURNING id
                """,
                (u["username"], u["profile_medium"], u["sex"], u["birth_date"], u["height_cm"], u["weight_kg"],
                 u["rest_heartrate"], u["max_heartrate_calculated"]),
            ).fetchone()
            user_ids[u["id"]] = row[0]

            # DOCASNE: propojeni se Stravou (aby prihlaseni naslo stejneho uzivatele).
            # Tokeny zamerne NEprenasime - byly v minulosti verejne na GitHubu.
            if u["strava_athlete_id"]:
                pg.execute(
                    "INSERT INTO strava_accounts (user_id, athlete_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (row[0], u["strava_athlete_id"]),
                )

            # vypocitane hodnoty o uzivateli
            pg.execute(
                """
                INSERT INTO user_metrics (user_id, hrr, acwr, estimated_vo2max, estimated_vo2max_at)
                VALUES (%s, %s, %s, %s, %s::timestamptz)
                ON CONFLICT (user_id) DO NOTHING
                """,
                (row[0], u["hrr"], u["awrs"], u["estimated_vo2max"], u["estimated_vo2max_updated_at"]),
            )

            # AI hodnoceni celeho uzivatele
            if u["ai_headline"]:
                pg.execute(
                    """
                    INSERT INTO ai_insights (user_id, status, badge, headline, summary, risks, actions, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, COALESCE(%s::timestamptz, now()))
                    """,
                    (row[0], u["ai_status"], u["ai_badge"], u["ai_headline"], u["ai_summary"],
                     as_json(u["ai_risks"]), as_json(u["ai_actions"]), u["ai_updated_at"]),
                )

        # --- aktivity ---
        imported = 0
        for a in src.execute("SELECT * FROM activities"):
            if a["user_id"] not in user_ids:  # uzivatel nebyl importovan (ONLY_USERNAME)
                continue
            row = pg.execute(
                """
                INSERT INTO activities (user_id, source, external_id, sport_type, name, started_at,
                    elapsed_time_s, moving_time_s, distance_m, elevation_gain_m,
                    avg_hr, max_hr, avg_cadence, avg_speed_ms, max_speed_ms)
                VALUES (%s, 'strava', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, source, external_id) DO NOTHING
                RETURNING id
                """,
                (user_ids[a["user_id"]], str(a["id"]), (a["type"] or "unknown").lower(), a["name"],
                 a["start_date"], a["elapsed_time"], a["moving_time"], a["distance"], a["Elevation"],
                 a["average_heartrate"], a["max_heartrate"], a["average_cadence"],
                 a["average_speed"], a["max_speed"]),
            ).fetchone()
            if row is None:  # uz byla naimportovana drive
                continue
            imported += 1
            activity_id = row[0]

            # vypocitane metriky
            pg.execute(
                """
                INSERT INTO activity_metrics (activity_id, trimp, intensity, estimated_vo2, pace_min_per_km)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (activity_id, a["trimp"], a["intensity"], a["estimated_vo2"], a["Avg_speed"]),
            )

            # AI hodnoceni konkretniho behu
            if a["ai_headline"]:
                pg.execute(
                    """
                    INSERT INTO ai_insights (user_id, activity_id, badge, headline, summary, effort, risks, actions, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s::timestamptz, now()))
                    """,
                    (user_ids[a["user_id"]], activity_id, a["ai_badge"], a["ai_headline"], a["ai_summary"], a["ai_effort"],
                     as_json(a["ai_risks"]), as_json(a["ai_actions"]), a["ai_updated_at"]),
                )

        print(f"Uzivatele: {len(user_ids)}, nove aktivity: {imported}")


if __name__ == "__main__":
    main()
