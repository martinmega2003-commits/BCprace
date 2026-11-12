import os
import sys
from datetime import datetime as RealDateTime
from pathlib import Path
from unittest.mock import patch

import psycopg
import pytest
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")

# pojistka: testy mazou tabulky -> smi bezet jen proti databazi *_test
db_name = TEST_DATABASE_URL.rsplit("/", 1)[-1].split("?")[0]
if not db_name.endswith("_test"):
    pytest.exit(f"TEST_DATABASE_URL musi mirit na databazi *_test (ted: '{db_name}')", returncode=2)

# db.py cte DATABASE_URL pri importu -> nastavit driv, nez se naimportuje Main.py
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

PYTHON_DIR = Path(__file__).resolve().parents[1]
SCHEMA_SQL = (PYTHON_DIR.parent / "DB" / "schema.sql").read_text(encoding="utf-8")

# aby sel naimportovat Main.py ze slozky Python/ (az PO nastaveni DATABASE_URL)
sys.path.insert(0, str(PYTHON_DIR))
import Main  # noqa: E402


class FixedDateTime(RealDateTime):
    """V testech je 'dnes' vzdy stejny den -> vysledky nezavisi na tom, kdy testy bezi."""

    @classmethod
    def today(cls):
        return cls(2026, 5, 21, 12, 0, 0)


@pytest.fixture(autouse=True)
def clean_database():
    """Pred kazdym testem smaze a znovu vytvori vsechny tabulky."""
    with psycopg.connect(TEST_DATABASE_URL) as conn:
        conn.execute(SCHEMA_SQL)
    yield


@pytest.fixture
def client():
    """HTTP klient pro volani endpointu, s pevnym datem 'dnes'."""
    with patch.object(Main, "datetime", FixedDateTime):
        yield TestClient(Main.app)
