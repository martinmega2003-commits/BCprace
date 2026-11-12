from pathlib import Path
from datetime import datetime, timezone
from importers.gpx import parse_gpx

SOUBORY = Path(__file__).parent / "soubory"


def test_gpx_precte_nazev_behu():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()
    vysledek = parse_gpx(obsah)

    assert vysledek["name"] == "Ranni beh"

def test_gpx_precte_zacatek_behu():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()
    vysledek = parse_gpx(obsah)

    assert vysledek["started_at"] == datetime(2026, 5, 20, 6, 0, 0, tzinfo=timezone.utc)

def test_gpx_spocita_delku_behu():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()
    vysledek = parse_gpx(obsah)
    
    assert vysledek["elapsed_time_s"] == 60

