import json

from fastapi import FastAPI
import os
from pathlib import Path
import sqlite3
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
import math
from openai import OpenAI

from dotenv import load_dotenv

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

load_dotenv()

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_SYSTEM_PROMPT1 = os.getenv("AZURE_OPENAI_SYSTEM_PROMPT1")
AZURE_OPENAI_SYSTEM_PROMPT2 = os.getenv("AZURE_OPENAI_SYSTEM_PROMPT2")



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
    last_date = today

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
        


        cursor.execute("UPDATE activities SET trimp = ? WHERE id = ?  ", (trimp, id)) 



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

    chronicLoad = sum(chronicTrimp) / 4
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



@app.get("/ai")
def read_root(user_id: int):

    endpoint = AZURE_OPENAI_ENDPOINT
    deployment_name = AZURE_OPENAI_DEPLOYMENT
    api_key = AZURE_OPENAI_API_KEY

    twenty_eight_days_ago = (datetime.today() - timedelta(days=28)).isoformat()
    today = datetime.today()

    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    
    cursor = conn.cursor()

    cursor.execute("SELECT start_date, trimp FROM activities WHERE user_id = ? AND start_date >= ? ORDER BY start_date DESC", (user_id, twenty_eight_days_ago))



    ActivityRaw = cursor.fetchall()

    if not ActivityRaw:
        return {"message": "chybi activityRowsRAW"}

    activities = [dict(row) for row in ActivityRaw]

    JsonActivity = json.dumps(activities, ensure_ascii=False)

    cursor.execute("SELECT awrs, estimated_vo2max FROM users WHERE id = ?", (user_id,))

    RawUserData = cursor.fetchone()

    awrs = RawUserData["awrs"]
    
    estimated_vo2max = RawUserData["estimated_vo2max"]

    if not RawUserData:
        return {"message": "chybi awrs"}

    cursor.execute(
        "SELECT start_date FROM activities WHERE user_id = ? ORDER BY start_date DESC LIMIT 2",
        (user_id,)
    )
    last_two_activities_raw = cursor.fetchall()
    
        
    
    lastActivityDayRaw= activities[0]["start_date"]

    lastActivityDay = datetime.fromisoformat(lastActivityDayRaw.replace("Z", "+00:00")).replace(tzinfo=None)

    DaysFromLastActivity = (today - lastActivityDay).days


    NotTrainingForLong = DaysFromLastActivity >= 14
    UnderTrainingRisk = awrs < 0.8

    GapBetweenLastTwoActivities = None
    ReturningAfterLongBreak = False

    if len(last_two_activities_raw) >= 2:
        last_activity_date = datetime.fromisoformat(last_two_activities_raw[0]["start_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        previous_activity_date = datetime.fromisoformat(last_two_activities_raw[1]["start_date"].replace("Z", "+00:00")).replace(tzinfo=None)

        GapBetweenLastTwoActivities = (last_activity_date - previous_activity_date).days

        if DaysFromLastActivity <= 7 and GapBetweenLastTwoActivities >= 14:
            ReturningAfterLongBreak = True

    BackendRisks = []

    if ReturningAfterLongBreak == True:
        BackendRisks.append("Navrat do treninku po delsi pauze zvysuje riziko prilis rychleho navyseni zateze.")
        
    if UnderTrainingRisk:
        BackendRisks.append("Nizka aktualni zatez muze snizovat pripravenost na vyssi treninkove zatizeni.")

    

    
    StatusFromMetrics = "ok"

    if UnderTrainingRisk and not ReturningAfterLongBreak:
        StatusFromMetrics = "low"

    if ReturningAfterLongBreak:
        StatusFromMetrics = "elevated"

    if awrs > 1.5 and not ReturningAfterLongBreak:
        StatusFromMetrics = "elevated"

    if awrs > 2.0 and not ReturningAfterLongBreak:
        StatusFromMetrics = "high"





    client = OpenAI(
        base_url=endpoint,
        api_key=api_key
    )

    completion = client.chat.completions.create(
        temperature=0,
        model=deployment_name,
        messages=[
            {
                "role": "system",
                "content": AZURE_OPENAI_SYSTEM_PROMPT1,
            },
            {
                "role": "user",
                "content": f"Pracuj pouze s těmito vstupy. Nic nepřidávej a nic neodhaduj. Pokud nějaký údaj není přímo ve vstupu, nesmí se objevit ve výstupu. Nepoužívej časové formulace jako 'v posledním týdnu', 'před týdnem' nebo 'nedávno', pokud je nelze přesně odvodit ze vstupu. Vysoké AWRS samo o sobě neznamená potvrzené přetížení ani zákaz dalšího běhu. Pokud nejsou přítomné další negativní signály, interpretuj vysoké AWRS spíše jako zvýšenou opatrnost a potřebu rozumné regulace další zátěže, ne jako akutní problém. Pokud backend_risks obsahuje alespoň jednu položku, nesmíš ve summary ani v risks tvrdit, že žádná rizika nejsou přítomná. Backend_risks ber jako závazná fakta. Pokud je estimated_vo2max dostupne, zohledni ho ve summary a actions jako orientacni ukazatel aerobni vykonnosti. Nestaci jen uvest cislo. Strucne vysvetli, co dana hodnota znamena pro bezce v praktickem kontextu vytrvalosti nebo aerobni vykonnosti. Nepopisuj ji jako laboratorni mereni, ale jako odhad. Vstup 1 - recent_activities JSON: {JsonActivity}. Vstup 2 - AWRS: {awrs}. Vstup 3 - days_since_last_activity: {DaysFromLastActivity}. Vstup 4 - not_training_for_long: {NotTrainingForLong}. Vstup 5 - undertraining_risk: {UnderTrainingRisk}. Vstup 6 - gap_between_last_two_activities: {GapBetweenLastTwoActivities}. Vstup 7 - returning_after_long_break: {ReturningAfterLongBreak}. Vstup 8 - status_from_metrics: {StatusFromMetrics}. Vstup 9 - backend_risks: {BackendRisks}. Vstup 10 - estimated_vo2max: {estimated_vo2max}. Na základě pouze těchto vstupů vrať požadovaný JSON.",
            },
        ],

    
        response_format={"type": "json_object"},

    )

    x = completion.choices[0].message

    parsed_response = json.loads(x.content)
    parsed_response["status"] = StatusFromMetrics


    return {
        "response": parsed_response,
        "debug": {
            "awrs": awrs,
            "DaysFromLastActivity": DaysFromLastActivity,
            "GapBetweenLastTwoActivities": GapBetweenLastTwoActivities,
            "ReturningAfterLongBreak": ReturningAfterLongBreak,
            "UnderTrainingRisk": UnderTrainingRisk,
            "StatusFromMetrics": StatusFromMetrics,
        }
    }






'''
@app.get("/aiTraining")
def read_root(user_id: int, activity_id: int):
    endpoint = AZURE_OPENAI_ENDPOINT
    deployment_name = AZURE_OPENAI_DEPLOYMENT
    api_key = AZURE_OPENAI_API_KEY

    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """SELECT id, name, distance, moving_time, elapsed_time, type, start_date,
                  average_heartrate, max_heartrate, intensity, trimp, Avg_speed
           FROM activities
           WHERE user_id = ? AND id = ?""",
        (user_id, activity_id)
    )
    activity_row = cursor.fetchone()

    if not activity_row:
        conn.close()
        return {"message": "chybi activity"}

    activity = dict(activity_row)
    json_activity = json.dumps(activity, ensure_ascii=False)

    cursor.execute("SELECT awrs FROM users WHERE id = ?", (user_id,))
    raw_awrs = cursor.fetchone()

    if not raw_awrs:
        conn.close()
        return {"message": "chybi awrs"}

    awrs = raw_awrs["awrs"]
    conn.close()

    client = OpenAI(
        base_url=endpoint,
        api_key=api_key
    )

    completion = client.chat.completions.create(
        temperature=0,
        model=deployment_name,
        messages=[
            {
                "role": "system",
                "content": AZURE_OPENAI_SYSTEM_PROMPT2
            },
            {
                "role": "user",
                "content": f"Vyhodnoť pouze tento jeden trénink. Aktivita JSON: {json_activity}. Aktuální AWRS uživatele: {awrs}. Nevytvářej kontext, který není ve vstupu. Vrať pouze požadovaný JSON.",
            },
        ],
        response_format={"type": "json_object"},
    )

    x = completion.choices[0].message

    return {"response": x}


'''

@app.get("/VO2MaxCalcul")
def read_root(user_id: int):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        "SELECT max_heartrate_calculated, hrr, rest_heartrate FROM users WHERE id = ?",
        (user_id,)
    )
    userDataRAW = cursor.fetchone()

    if not userDataRAW:
        conn.close()
        return {"message": "chybi userData"}

    rest_heartrate = userDataRAW["rest_heartrate"]
    hrr = userDataRAW["hrr"]

    if rest_heartrate is None or hrr is None or hrr <= 0:
        conn.close()
        return {"message": "chybi rest_heartrate nebo hrr"}

    def load_candidates(window_days: int):
        since_date = (datetime.today() - timedelta(days=window_days)).isoformat()

        cursor.execute(
            """
            SELECT moving_time, average_heartrate, distance, average_speed, start_date, id
            FROM activities
            WHERE user_id = ? AND type = 'Run' AND start_date >= ?
            """,
            (user_id, since_date)
        )
        activity_rows = cursor.fetchall()

        clean_activity = []

        for activity in activity_rows:
            if activity["average_heartrate"] is None:
                continue
            if activity["distance"] is None or activity["distance"] < 3000:
                continue
            if activity["moving_time"] is None or activity["moving_time"] < 1200:
                continue
            if activity["average_speed"] is None or activity["average_speed"] <= 0:
                continue

            clean_activity.append(dict(activity))

        vo2_candidates = []

        for activity in clean_activity:
            speed_m_per_min = activity["average_speed"] * 60
            vo2_beh = round(3.5 + 0.2 * speed_m_per_min, 3)
            relative_intensity = round((activity["average_heartrate"] - rest_heartrate) / hrr, 3)

            if relative_intensity < 0.75:
                continue

            estimated_vo2max = round(3.5 + (vo2_beh - 3.5) / relative_intensity, 3)

            vo2_candidates.append({
                "id": activity["id"],
                "distance": activity["distance"],
                "moving_time": activity["moving_time"],
                "average_heartrate": activity["average_heartrate"],
                "average_speed": activity["average_speed"],
                "VO2_beh": vo2_beh,
                "relative_intensity": relative_intensity,
                "EstimatedVO2max": estimated_vo2max,
            })

        return vo2_candidates

    VO2MaxCandidates = load_candidates(30)
    source_window_days = 30
    fresh = True

    if not VO2MaxCandidates:
        VO2MaxCandidates = load_candidates(90)
        source_window_days = 90
        fresh = False

    if not VO2MaxCandidates:
        conn.close()
        return {
            "estimated_vo2max": None,
            "source_window_days": None,
            "fresh": False,
            "message": "Za poslednich 90 dni neni zadna vhodna bezecka aktivita pro odhad VO2max."
        }

    EstimatedVO2MaxFinal = max(candidate["EstimatedVO2max"] for candidate in VO2MaxCandidates)

    estimated_vo2max_updated_at = datetime.today().isoformat()

    cursor.execute(
        "UPDATE users SET estimated_vo2max = ?, estimated_vo2max_updated_at = ? WHERE id = ?",
        (EstimatedVO2MaxFinal, estimated_vo2max_updated_at, user_id)
    )

    conn.commit()

    conn.close()


    return {
        "estimated_vo2max": EstimatedVO2MaxFinal,
        "source_window_days": source_window_days,
        "fresh": fresh,
        "candidates_count": len(VO2MaxCandidates),
        "VO2MaxCandidates": VO2MaxCandidates,
    }
