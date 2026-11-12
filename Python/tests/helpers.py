"""Pomucky pro testy: vlozeni testovacich dat a cteni z databaze."""

import os

import psycopg


def _connect():
    return psycopg.connect(os.environ["DATABASE_URL"])


def insert_user(user_id=1, birth_date="2000-01-01", rest_hr=None, max_hr=None,
                hrr=None, acwr=None, estimated_vo2max=None):
    """Vlozi uzivatele, pripadne i jeho vypocitane metriky (user_metrics)."""
    with _connect() as conn:
        conn.execute(
            "INSERT INTO users (id, username, birth_date, rest_hr, max_hr) VALUES (%s, %s, %s, %s, %s)",
            (user_id, f"tester{user_id}", birth_date, rest_hr, max_hr),
        )
        if hrr is not None or acwr is not None or estimated_vo2max is not None:
            conn.execute(
                "INSERT INTO user_metrics (user_id, hrr, acwr, estimated_vo2max) VALUES (%s, %s, %s, %s)",
                (user_id, hrr, acwr, estimated_vo2max),
            )


def insert_activity(activity_id, user_id=1, name="Test run", distance_m=5000, moving_time_s=1500,
                    elapsed_time_s=1500, sport_type="run", started_at="2026-05-20T10:00:00Z",
                    avg_speed_ms=None, avg_hr=None, max_hr=None, elevation_gain_m=None, trimp=None):
    """Vlozi aktivitu, pripadne i jeji TRIMP (activity_metrics)."""
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO activities (id, user_id, source, external_id, sport_type, name, started_at,
                elapsed_time_s, moving_time_s, distance_m, elevation_gain_m, avg_hr, max_hr, avg_speed_ms)
            VALUES (%s, %s, 'test', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (activity_id, user_id, str(activity_id), sport_type, name, started_at, elapsed_time_s,
             moving_time_s, distance_m, elevation_gain_m, avg_hr, max_hr, avg_speed_ms),
        )
        if trimp is not None:
            conn.execute(
                "INSERT INTO activity_metrics (activity_id, trimp) VALUES (%s, %s)",
                (activity_id, trimp),
            )


def scalar(query, params=()):
    """Vrati jednu hodnotu z databaze (nebo None, kdyz radek neexistuje)."""
    with _connect() as conn:
        row = conn.execute(query, params).fetchone()
    return None if row is None else row[0]
