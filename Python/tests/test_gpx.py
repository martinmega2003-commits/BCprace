from pathlib import Path

from importers.gpx import parse_gpx

SOUBORY = Path(__file__).parent / "soubory"


def test_gpx_precte_nazev_behu():
    obsah = (SOUBORY / "kratky_beh.gpx").read_bytes()

    vysledek = parse_gpx(obsah)
    print(vysledek)  

    assert vysledek["name"] == "Ranni beh"
