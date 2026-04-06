from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path


DB_PATH = Path(os.environ.get("SQLITE_DB_PATH", Path(__file__).resolve().parent.parent / "web" / "muj-next-app" / "strava.sqlite"))


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python import_strava_json.py <path-to-json>")
        return 1

    json_path = Path(sys.argv[1]).expanduser().resolve()
    if not json_path.exists():
        print(f"JSON file not found: {json_path}")
        return 1

    with json_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    token_exchange = payload["tokenExchange"]
    athlete = token_exchange["athlete"]
    activities = payload.get("activities", [])

    athlete_id = athlete["id"]
    username = athlete["username"]
    access_token = token_exchange["access_token"]
    refresh_token = token_exchange["refresh_token"]
    expires_at = token_exchange["expires_at"]

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO users (strava_athlete_id, username)
        VALUES (?, ?)
        ON CONFLICT(strava_athlete_id) DO UPDATE SET
            username = excluded.username
        """,
        (athlete_id, username),
    )

    cur.execute(
        "SELECT id FROM users WHERE strava_athlete_id = ?",
        (athlete_id,),
    )
    user_row = cur.fetchone()
    if not user_row:
        conn.close()
        print("Failed to find or create user row.")
        return 1

    user_id = user_row[0]

    cur.execute(
        """
        INSERT INTO strava_tokens (user_id, athlete_id, access_token, refresh_token, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            athlete_id = excluded.athlete_id,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at
        """,
        (user_id, athlete_id, access_token, refresh_token, expires_at),
    )

    for activity in activities:
        cur.execute(
            """
            INSERT INTO activities (id, user_id, name, distance, moving_time, elapsed_time, type, start_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                user_id = excluded.user_id,
                name = excluded.name,
                distance = excluded.distance,
                moving_time = excluded.moving_time,
                elapsed_time = excluded.elapsed_time,
                type = excluded.type,
                start_date = excluded.start_date
            """,
            (
                activity["id"],
                user_id,
                activity["name"],
                activity["distance"],
                activity["moving_time"],
                activity["elapsed_time"],
                activity["type"],
                activity["start_date"],
            ),
        )

    conn.commit()
    conn.close()

    print(
        f"Imported athlete {athlete_id} as user {user_id}. "
        f"Activities upserted: {len(activities)}. Sessions untouched."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
