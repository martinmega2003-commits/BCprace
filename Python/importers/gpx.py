import gpxpy


def parse_gpx(obsah):
    text = obsah.decode("utf-8")
    gpx =gpxpy.parse(text)
    trasa = gpx.tracks[0]
    return {"name": trasa.name}