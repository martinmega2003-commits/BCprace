from fastapi import FastAPI
import os
from pathlib import Path
import sqlite3
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
import math

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db_path() -> Path:
    return Path(os.environ.get("SQLITE_DB_PATH", Path(__file__).resolve().parent.parent / "web" / "muj-next-app" / "strava.sqlite"))

@app.get("/weeklyvolume")
def read_root(user_id: int):
    db_path = get_db_path()
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
    thisweekvolume = 0
    today = datetime.today()
    start_of_week = today - timedelta(days=today.weekday())
    this_week_days = [
        {"day": "Po", "volume": 0},
        {"day": "Ut", "volume": 0},
        {"day": "St", "volume": 0},
        {"day": "Ct", "volume": 0},
        {"day": "Pa", "volume": 0},
        {"day": "So", "volume": 0},
        {"day": "Ne", "volume": 0},
    ]
        

    for activity in activities:
        
        distance = activity["distance"]
        weekly_volume += distance
        all_km += distance
        activity_date = datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        activity_dates.append(activity_date)
        iso_calendar = activity_date.isocalendar()
        year = iso_calendar.year
        week = iso_calendar.week
        week_key = (year, week)

        if week_key not in weekly_totals:
            weekly_totals[week_key]= 0
        
        weekly_totals[week_key] += distance

        if activity_date >= start_of_week:
            thisweekvolume += distance
            numberofday = activity_date.weekday()
            this_week_days[numberofday]["volume"] += distance


            
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
        week_start = datetime.fromisocalendar(year, week, 1)
        weekly_rows.append({
            "year": year,
            "week": week,
            "volume": round(volume / 1000, 3),
            "week_start": week_start.date().isoformat(),
        })

    weekly_rows.sort(key=lambda row: (row["year"], row["week"]))
    thisweekvolume = round(thisweekvolume / 1000, 3)

    for oneday in this_week_days:
        oneday["volume"] = round(oneday["volume"]/1000,3)

    return {"weekly_volume": weekly_rows, "all_km": all_km, "thisweekvolume": thisweekvolume, "this_week_days": this_week_days}



@app.get("/CalHRmax")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute("SELECT birth_date FROM users WHERE id = ?", (user_id,) )
    userRow = cursor.fetchone()

    if not userRow:
        return {"message": "chybi user"}
    
    birth_date = userRow["birth_date"]

    if not birth_date:
        return {"message": "chybi birth_date"}
    
    birthDate = datetime.strptime(birth_date, "%Y-%m-%d")
    today = datetime.today()
    UserAge = today.year - birthDate.year
    if(today.month, today.day) < (birthDate.month, birthDate.day):
        UserAge -=1
    
    predicted_hr_max1 = 220 - UserAge

    cursor.execute("SELECT max_heartrate FROM activities WHERE user_id = ? AND max_heartrate IS NOT NULL", (user_id,))
    heartRateRows = cursor.fetchall()

    if not heartRateRows:
        return {"message": "chybi max_heartrate"}

    heartRates =[]


    for hearthrate in heartRateRows:        
        heartRates.append(hearthrate["max_heartrate"])

    observed_hr_max = max(heartRates)

    final_hr_max = round(((predicted_hr_max1 ** 2 + observed_hr_max ** 2) / 2) ** 0.5)

    cursor.execute("UPDATE users SET max_heartrate_calculated = ? WHERE id = ?", (final_hr_max, user_id))
    conn.commit()
    conn.close()


    return {
    "vek": UserAge,
    "observed": observed_hr_max,
    "predicted": predicted_hr_max1,
    "FINAL": final_hr_max,
    "updated_rows": cursor.rowcount,
}


@app.get("/HRR")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute(
        "SELECT max_heartrate_calculated, rest_heartrate FROM users WHERE id = ?",
        (user_id,)
    )

    userRow = cursor.fetchone()

    if not userRow:
        return {"message": "chybi user"}
    
    max_heartrate = userRow["max_heartrate_calculated"]
    if max_heartrate is None:
        return {"message": "chybi maxheartrate"}
    
    rest_heartrate = userRow["rest_heartrate"]
    if rest_heartrate is None:
        return {"message": "chybi restheartrate"}


    result_HRR = max_heartrate - rest_heartrate

    cursor.execute("UPDATE users SET hrr = ? WHERE id = ?", (result_HRR, user_id))
    conn.commit()
    conn.close()



    return {
        "rest_heartrate": rest_heartrate,
        "max_heartrate": max_heartrate,
        "result_HRR": result_HRR,
    }


@app.get("/IntesityCalcul")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute("SELECT max_heartrate_calculated, rest_heartrate, hrr FROM users WHERE id = ?",(user_id,))

    userRow = cursor.fetchone()

    if not userRow:
        return {"message": "chybi user"}
    
    max_heartrate = userRow["max_heartrate_calculated"]
    if max_heartrate is None:
        return {"message": "chybi maxheartrate"}
    
    rest_heartrate = userRow["rest_heartrate"]
    if rest_heartrate is None:
        return {"message": "chybi restheartrate"}

    hrr = userRow["hrr"]
    if hrr is None:
        return {"message": "chybi hrr"}
    

    cursor.execute("SELECT average_heartrate, id FROM activities WHERE user_id = ?",(user_id,))

    Avghr_rows = cursor.fetchall()

    if not Avghr_rows:
        return {"message": "chybi Avghr_rows"}

    average_hearrate_rows =[]

    for avgheartrate in Avghr_rows:
        if avgheartrate["average_heartrate"] == None:
            continue
        average_hearrate_rows.append({
    "id": avgheartrate["id"],
    "average_heartrate": avgheartrate["average_heartrate"],
})

    intenzita= []

    for Activity in average_hearrate_rows:
        intenzita.append({
            "id": Activity["id"],
            "intenzita": round((Activity["average_heartrate"] - rest_heartrate) / hrr, 3)
        })

    
    for oneintenzita in intenzita:
        cursor.execute("UPDATE activities SET intensity = ? WHERE id = ? AND type = 'Run' ", (oneintenzita["intenzita"], oneintenzita["id"])) 


    conn.commit()
    conn.close()


    return {
        "rest_heartrate": rest_heartrate,
        "max_heartrate": max_heartrate,
        "intenzita": intenzita,
        
    }



@app.get("/Trimp")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute("SELECT max_heartrate_calculated, rest_heartrate  FROM users WHERE id= ?", (user_id,))
    userDataRAW = cursor.fetchone()

    if not userDataRAW:
        return {"message": "chybi userData"}

    cursor.execute("SELECT  moving_time, average_heartrate, id FROM activities WHERE user_id= ?", (user_id,))
    ActvityDataRAW = cursor.fetchall()

    if not ActvityDataRAW:
        return {"message": "chybi ActvityDataRAW"}

    userData = {
        "max_heartrate_calculated": userDataRAW["max_heartrate_calculated"],
        "rest_heartrate": userDataRAW["rest_heartrate"],

    }


    for activity in ActvityDataRAW:
        moving_time_minutes = round(activity["moving_time"] / 60)  # Přepočet na minuty
        average_heartrate = activity["average_heartrate"]
        id = activity["id"],
        if activity["average_heartrate"] is None:
            continue

        # Výpočet TRIMP pro každou aktivitu
        id = activity["id"]
        T = moving_time_minutes
        HR_ex = average_heartrate
        HR_rest = userData["rest_heartrate"]
        HR_max = userData["max_heartrate_calculated"]
        
        # Aplikace vzorce pro TRIMP
        trimp = round(T * ((HR_ex - HR_rest) / (HR_max - HR_rest)) ** 1.92 * 0.64 * math.e, 3)
        


        cursor.execute("UPDATE activities SET trimp = ? WHERE id = ? AND type = 'Run' ", (trimp, id)) 



    conn.commit()
    conn.close()



    return {
        "userData": userDataRAW,
        "ActvityData": ActvityDataRAW,

    }




@app.get("/awrs")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute("SELECT trimp, start_date FROM activities WHERE user_id = ? AND trimp IS NOT NULL", (user_id,))

    activityRowsRAW = cursor.fetchall()
    if not activityRowsRAW:
            return {"message": "chybi activityRowsRAW"}

    today = datetime.today()


    acuteTrimp = []
    chronicTrimp = []

    for row in activityRowsRAW:
        activityDate = datetime.strptime(row["start_date"], "%Y-%m-%dT%H:%M:%SZ")

        daysAgo = (today - activityDate).days

        if daysAgo <= 7:
            acuteTrimp.append(row["trimp"])
        if daysAgo <=28:
            chronicTrimp.append(row["trimp"])

    acuteLoad = sum(acuteTrimp)

    if not chronicTrimp:
        return {"message": "chybi chronicTrimp"}

    chronicLoad = sum(chronicTrimp) / len(chronicTrimp)
    awrs = round(acuteLoad / chronicLoad, 3)


    cursor.execute(
    "UPDATE users SET awrs = ? WHERE id = ?",
    (awrs, user_id))
    
    conn.commit()
    conn.close()




    return {
        "awrs": awrs,
        "updated_rows": cursor.rowcount,
    }




@app.get("/avg")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()

    cursor.execute("SELECT id, distance, moving_time FROM activities WHERE user_id = ? AND type = 'Run'", (user_id,))
    ActivityRaw = cursor.fetchall()

    if not ActivityRaw:
        return {"message": "chybi activityRowsRAW"}



    for actvity in ActivityRaw:
        tempo = round((actvity["moving_time"] / 60) / (actvity["distance"] / 1000), 3)
        cursor.execute("UPDATE activities SET Avg_speed=? WHERE id=?",(tempo, actvity["id"]))

    conn.commit()
    conn.close()


    return {
        "avarage_tempo": tempo,
    }
