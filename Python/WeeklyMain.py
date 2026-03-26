from fastapi import FastAPI
from pathlib import Path
import sqlite3
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta


app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/weeklyvolume")
def read_root(user_id: int):
    db_path = Path(__file__).resolve().parent.parent / "web" / "muj-next-app" / "strava.sqlite"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute("SELECT start_date, type, distance FROM activities WHERE user_id = ? AND type = 'Run'", (user_id,) )

    ActivityFromDB = cursor.fetchall()
    conn.close()


    if not ActivityFromDB:
        return{"message": "chybi bezecka aktivita"}
    
    activities = [dict(row) for row in ActivityFromDB]

    weekly_volume = 0
    all_km = 0
    weekly_totals = {}
    activity_dates = []
    weekly_rows = []

    for activity in activities:
        distance = activity["distance"]
        weekly_volume += distance
        all_km += distance
        activity_date = datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00"))
        activity_dates.append(activity_date)
        iso_calendar = activity_date.isocalendar()
        year = iso_calendar.year
        week = iso_calendar.week
        week_key = (year, week)

        if week_key not in weekly_totals:
            weekly_totals[week_key]= 0
        
        weekly_totals[week_key] += distance

    first_date = min(activity_dates)
    last_date = max(activity_dates)

    current_date = first_date

    while(current_date<=last_date):
        iso_calendar = current_date.isocalendar()
        year = iso_calendar.year
        week = iso_calendar.week
        week_key = (year, week)
        if week_key not in weekly_totals:
            weekly_totals[week_key] = 0
        current_date += timedelta(days=7)

    for week_key, volume in weekly_totals.items():
        year, week = week_key
        weekly_rows.append({
            "year": year,
            "week": week,
            "volume": volume,
        })

    weekly_rows.sort(key=lambda row: (row["year"], row["week"]))

    return {"weekly_volume": weekly_rows, "all_km": all_km}
