from datetime import datetime, timezone
from pathlib import Path

import pytest

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


def test_gpx_spocita_vzdalenost():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()
    vysledek = parse_gpx(obsah)

    # 3 body, mezi sousednimi je 0.0009 stupne zemepisne sirky = cca 100 m -> celkem cca 200 m
    # GPS vzdalenost nikdy nevyjde presne -> porovnavame "priblizne" (tolerance 1 metr)
    assert vysledek["distance_m"] == pytest.approx(200, abs=1)


def test_gpx_spocita_prumerny_a_maximalni_tep():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()
    vysledek = parse_gpx(obsah)

    # tepy v souboru: 120, 140, 160
    assert vysledek["avg_hr"] == 140
    assert vysledek["max_hr"] == 160


def test_gpx_prevede_typ_sportu():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()
    vysledek = parse_gpx(obsah)

    # v souboru je <type>running</type>, v databazi pouzivame jednotne "run"
    assert vysledek["sport_type"] == "run"
