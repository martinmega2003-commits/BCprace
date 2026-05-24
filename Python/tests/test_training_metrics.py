import gc
import math
import os
import sqlite3
import sys
import tempfile
import types
import unittest
from datetime import datetime as RealDateTime
from pathlib import Path
from unittest.mock import patch


openai_stub = types.ModuleType("openai")


class OpenAI:
    pass


openai_stub.OpenAI = OpenAI
sys.modules.setdefault("openai", openai_stub)

dotenv_stub = types.ModuleType("dotenv")
dotenv_stub.load_dotenv = lambda *args, **kwargs: None
sys.modules.setdefault("dotenv", dotenv_stub)

PYTHON_DIR = Path(__file__).resolve().parents[1]
if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))

import Main


class FixedDateTime(RealDateTime):
    @classmethod
    def today(cls):
        return cls(2026, 5, 21, 12, 0, 0)


class TrainingMetricEndpointTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "training_metrics.sqlite"
        self.previous_db_path = os.environ.get("SQLITE_DB_PATH")
        os.environ["SQLITE_DB_PATH"] = str(self.db_path)
        self.create_schema()

    def tearDown(self):
        if self.previous_db_path is None:
            os.environ.pop("SQLITE_DB_PATH", None)
        else:
            os.environ["SQLITE_DB_PATH"] = self.previous_db_path
        gc.collect()
        self.temp_dir.cleanup()

    def create_schema(self):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.executescript(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    birth_date TEXT,
                    rest_heartrate REAL,
                    max_heartrate_calculated REAL,
                    hrr REAL,
                    awrs REAL,
                    estimated_vo2max REAL,
                    estimated_vo2max_updated_at TEXT
                );

                CREATE TABLE activities (
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
                    estimated_vo2 REAL
                );
                """
            )
        finally:
            conn.close()

    def call_endpoint(self, path, **kwargs):
        for route in Main.app.routes:
            if getattr(route, "path", None) == path:
                with patch.object(Main, "datetime", FixedDateTime):
                    return route.endpoint(**kwargs)
        raise AssertionError(f"Endpoint {path} nebyl nalezen")

    def insert_user(
        self,
        user_id=1,
        birth_date="2000-01-01",
        rest_heartrate=None,
        max_heartrate_calculated=None,
        hrr=None,
        awrs=None,
        estimated_vo2max=None,
    ):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute(
                """
                INSERT INTO users (
                    id, birth_date, rest_heartrate, max_heartrate_calculated,
                    hrr, awrs, estimated_vo2max
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    birth_date,
                    rest_heartrate,
                    max_heartrate_calculated,
                    hrr,
                    awrs,
                    estimated_vo2max,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def insert_activity(
        self,
        activity_id,
        user_id=1,
        name="Test run",
        distance=5000,
        moving_time=1500,
        elapsed_time=1500,
        activity_type="Run",
        start_date="2026-05-20T10:00:00Z",
        average_speed=None,
        average_heartrate=None,
        max_heartrate=None,
        trimp=None,
        elevation=None,
    ):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute(
                """
                INSERT INTO activities (
                    id, user_id, name, distance, moving_time, elapsed_time,
                    type, start_date, average_speed, average_heartrate,
                    max_heartrate, trimp, Elevation
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    activity_id,
                    user_id,
                    name,
                    distance,
                    moving_time,
                    elapsed_time,
                    activity_type,
                    start_date,
                    average_speed,
                    average_heartrate,
                    max_heartrate,
                    trimp,
                    elevation,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def scalar(self, query, params=()):
        conn = sqlite3.connect(self.db_path)
        try:
            return conn.execute(query, params).fetchone()[0]
        finally:
            conn.close()

    def test_scenario_3_dashboard_weekly_volume_groups_runs(self):
        self.insert_user()
        self.insert_activity(1, distance=5000, start_date="2026-05-19T10:00:00Z")
        self.insert_activity(2, distance=7000, start_date="2026-05-20T10:00:00Z")
        self.insert_activity(3, distance=3000, start_date="2026-05-12T10:00:00Z")
        self.insert_activity(
            4,
            distance=10000,
            activity_type="Walk",
            start_date="2026-05-20T10:00:00Z",
        )

        result = self.call_endpoint("/weeklyvolume", user_id=1)

        self.assertEqual(result["all_km"], 15000)
        self.assertEqual(result["thisweekvolume"], 12.0)

        week_days = {day["day"]: day["volume"] for day in result["this_week_days"]}
        self.assertEqual(week_days["Ut"], 5.0)
        self.assertEqual(week_days["St"], 7.0)

        weekly_volume = {
            (row["year"], row["week"]): row["volume"]
            for row in result["weekly_volume"]
        }
        self.assertEqual(weekly_volume[(2026, 20)], 3.0)
        self.assertEqual(weekly_volume[(2026, 21)], 12.0)

    def test_supporting_hrr_updates_user_from_max_and_rest_heart_rate(self):
        self.insert_user(rest_heartrate=50, max_heartrate_calculated=190)

        result = self.call_endpoint("/HRR", user_id=1)

        self.assertEqual(result["result_HRR"], 140)
        self.assertEqual(self.scalar("SELECT hrr FROM users WHERE id = 1"), 140)

    def test_scenario_5_pace_calculation_updates_min_per_km(self):
        self.insert_user()
        self.insert_activity(1, distance=5000, moving_time=1500)
        self.insert_activity(2, distance=10000, moving_time=3600, activity_type="Walk")

        result = self.call_endpoint("/avg", user_id=1)

        self.assertEqual(result["avarage_tempo"], 5.0)
        self.assertEqual(self.scalar("SELECT Avg_speed FROM activities WHERE id = 1"), 5.0)
        self.assertIsNone(self.scalar("SELECT Avg_speed FROM activities WHERE id = 2"))

    def test_scenario_6_intensity_and_trimp_are_calculated_from_heart_rate(self):
        self.insert_user(
            rest_heartrate=50,
            max_heartrate_calculated=200,
            hrr=150,
            estimated_vo2max=55,
        )
        self.insert_activity(1, moving_time=3600, average_heartrate=150)
        expected_intensity = round((150 - 50) / 150, 3)
        expected_vo2 = round(3.5 + expected_intensity * (55 - 3.5), 3)
        expected_trimp = round(
            60 * ((150 - 50) / (200 - 50)) ** 1.92 * 0.64 * math.e,
            3,
        )

        intensity_result = self.call_endpoint("/IntesityCalcul", user_id=1)
        self.call_endpoint("/Trimp", user_id=1)

        self.assertEqual(intensity_result["intenzita"][0]["intenzita"], expected_intensity)
        self.assertEqual(
            self.scalar("SELECT intensity FROM activities WHERE id = 1"),
            expected_intensity,
        )
        self.assertEqual(
            self.scalar("SELECT estimated_vo2 FROM activities WHERE id = 1"),
            expected_vo2,
        )
        self.assertEqual(
            self.scalar("SELECT trimp FROM activities WHERE id = 1"),
            expected_trimp,
        )

    def test_scenario_7_acwr_updates_user_from_acute_and_chronic_trimp(self):
        self.insert_user()
        self.insert_activity(1, start_date="2026-05-20T00:00:00Z", trimp=100)
        self.insert_activity(2, start_date="2026-05-16T00:00:00Z", trimp=60)
        self.insert_activity(3, start_date="2026-05-08T00:00:00Z", trimp=80)
        self.insert_activity(4, start_date="2026-04-30T00:00:00Z", trimp=40)
        self.insert_activity(5, start_date="2026-04-01T00:00:00Z", trimp=999)

        result = self.call_endpoint("/ACWR", user_id=1)

        self.assertEqual(result["ACWR"], 2.286)
        self.assertEqual(self.scalar("SELECT awrs FROM users WHERE id = 1"), 2.286)

    def test_scenario_8_vo2max_uses_valid_recent_running_candidate(self):
        self.insert_user(rest_heartrate=50, max_heartrate_calculated=200, hrr=150)
        self.insert_activity(
            1,
            distance=5000,
            moving_time=1500,
            start_date="2026-05-20T10:00:00Z",
            average_speed=5000 / 1500,
            average_heartrate=170,
            elevation=20,
        )
        speed_m_per_min = (5000 / 1500) * 60
        vo2_beh = round(3.5 + 0.2 * speed_m_per_min, 3)
        relative_intensity = round((170 - 50) / 150, 3)
        expected_vo2max = round(3.5 + (vo2_beh - 3.5) / relative_intensity, 3)

        result = self.call_endpoint("/VO2MaxCalcul", user_id=1)

        self.assertEqual(result["estimated_vo2max"], expected_vo2max)
        self.assertEqual(result["source_window_days"], 30)
        self.assertTrue(result["fresh"])
        self.assertEqual(result["candidates_count"], 1)
        self.assertEqual(
            self.scalar("SELECT estimated_vo2max FROM users WHERE id = 1"),
            expected_vo2max,
        )


if __name__ == "__main__":
    unittest.main()
