import gpxpy


def parse_gpx(obsah):
    text = obsah.decode("utf-8")
    gpx =gpxpy.parse(text)
    trasa = gpx.tracks[0]
    casy = gpx.get_time_bounds()
    return {
        "name": trasa.name,
        "started_at": casy.start_time,
        "elapsed_time_s": int((casy.end_time - casy.start_time).total_seconds()),
    }

