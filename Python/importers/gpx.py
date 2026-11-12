"""Cteni GPX souboru -> jedna aktivita ve stejnem tvaru jako tabulka activities."""

import gpxpy

# GPX pise typ sportu ruzne (Garmin "running", Strava cislem "9"...) -> prevod na nase jednotne nazvy
SPORT_TYPES = {
    "running": "run",
    "run": "run",
    "9": "run",  # Strava
    "walking": "walk",
    "walk": "walk",
    "10": "walk",  # Strava
    "hiking": "hike",
    "cycling": "ride",
    "biking": "ride",
    "1": "ride",  # Strava
}


def _heart_rates(gpx):
    """Projde vsechny body a vytahne tep z rozsireni (Garmin pise <gpxtpx:hr> uvnitr <extensions>)."""
    tepy = []
    for trasa in gpx.tracks:
        for segment in trasa.segments:
            for bod in segment.points:
                for rozsireni in bod.extensions:
                    # rozsireni je XML element; tep je jeho potomek, jehoz nazev konci na "hr"
                    for prvek in rozsireni.iter():
                        if prvek.tag.endswith("hr") and prvek.text:
                            tepy.append(float(prvek.text))
    return tepy


def parse_gpx(obsah):
    text = obsah.decode("utf-8")
    gpx = gpxpy.parse(text)
    trasa = gpx.tracks[0]
    casy = gpx.get_time_bounds()
    tepy = _heart_rates(gpx)

    return {
        "name": trasa.name,
        "sport_type": SPORT_TYPES.get((trasa.type or "").lower(), "unknown"),
        "started_at": casy.start_time,
        "elapsed_time_s": int((casy.end_time - casy.start_time).total_seconds()),
        "distance_m": gpx.length_2d(),
        # kdyz v souboru tep neni (napr. beh jen s telefonem), vratime None = "nevime"
        "avg_hr": sum(tepy) / len(tepy) if tepy else None,
        "max_hr": max(tepy) if tepy else None,
    }
