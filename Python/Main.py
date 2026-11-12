import json

from fastapi import FastAPI
import os
from datetime import datetime
from datetime import timedelta
import math
from openai import OpenAI
from psycopg.types.json import Jsonb
from db import get_conn
from dotenv import load_dotenv


app = FastAPI()

load_dotenv()

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_SYSTEM_PROMPT1 = os.getenv("AZURE_OPENAI_SYSTEM_PROMPT1")
AZURE_OPENAI_SYSTEM_PROMPT2 = os.getenv("AZURE_OPENAI_SYSTEM_PROMPT2")



def upsert_user_metrics(conn, user_id: int, **values):
    """Ulozi vypocitane hodnoty uzivatele (hrr, acwr, ...). Radek vytvori, pokud jeste neexistuje."""
    columns = ", ".join(values)
    placeholders = ", ".join(["%s"] * len(values))
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in values)
    conn.execute(
        f"""
        INSERT INTO user_metrics (user_id, {columns}) VALUES (%s, {placeholders})
        ON CONFLICT (user_id) DO UPDATE SET {updates}, updated_at = now()
        """,
        (user_id, *values.values()),
    )


def upsert_activity_metrics(conn, activity_id: int, **values):
    """Ulozi vypocitane hodnoty aktivity (trimp, intensity, ...). Radek vytvori, pokud jeste neexistuje."""
    columns = ", ".join(values)
    placeholders = ", ".join(["%s"] * len(values))
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in values)
    conn.execute(
        f"""
        INSERT INTO activity_metrics (activity_id, {columns}) VALUES (%s, {placeholders})
        ON CONFLICT (activity_id) DO UPDATE SET {updates}, computed_at = now()
        """,
        (activity_id, *values.values()),
    )


def badge_from_status(status: str | None) -> str:
    status_map = {
        "high": "1_star",
        "elevated": "2_star",
        "low": "3_star",
        "ok": "5_star",
    }
    return status_map.get(status, "3_star")


def badge_from_activity_insight(effort: str | None, risks: list[str]) -> str:
    base_score_map = {
        "lehké": 5,
        "střední": 4,
        "těžké": 3,
    }
    base_score = base_score_map.get(effort, 3)
    penalty = 1 if risks else 0
    score = max(1, base_score - penalty)
    return f"{score}_star"

@app.get("/weeklyvolume")
def read_root(user_id: int):
    with get_conn() as conn:
        ActivityFromDB = conn.execute(
            "SELECT started_at, sport_type, distance_m FROM activities WHERE user_id = %s AND sport_type = 'run'",
            (user_id,),
        ).fetchall()



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

        distance = activity["distance_m"] or 0
        weekly_volume += distance
        all_km += distance
        activity_date = activity["started_at"].replace(tzinfo=None)
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
    with get_conn() as conn:
        userRow = conn.execute("SELECT birth_date FROM users WHERE id = %s", (user_id,)).fetchone()

        if not userRow:
            return {"message": "chybi user"}

        # PostgreSQL vraci rovnou datum (typ DATE), neni potreba ho prevadet z textu
        birthDate = userRow["birth_date"]

        if not birthDate:
            return {"message": "chybi birth_date"}

        today = datetime.today()
        UserAge = today.year - birthDate.year
        if (today.month, today.day) < (birthDate.month, birthDate.day):
            UserAge -= 1

        predicted_hr_max1 = 220 - UserAge

        heartRateRows = conn.execute(
            "SELECT max_hr FROM activities WHERE user_id = %s AND max_hr IS NOT NULL", (user_id,)
        ).fetchall()

        if not heartRateRows:
            return {"message": "chybi max_heartrate"}

        observed_hr_max = max(row["max_hr"] for row in heartRateRows)

        final_hr_max = round(((predicted_hr_max1 ** 2 + observed_hr_max ** 2) / 2) ** 0.5)

        result = conn.execute("UPDATE users SET max_hr = %s WHERE id = %s", (final_hr_max, user_id))

    return {
        "vek": UserAge,
        "observed": observed_hr_max,
        "predicted": predicted_hr_max1,
        "FINAL": final_hr_max,
        "updated_rows": result.rowcount,
    }


@app.get("/HRR")
def read_root(user_id: int):
    with get_conn() as conn:
        userRow = conn.execute("SELECT max_hr, rest_hr FROM users WHERE id = %s", (user_id,)).fetchone()

        if not userRow:
            return {"message": "chybi user"}

        max_heartrate = userRow["max_hr"]
        if max_heartrate is None:
            return {"message": "chybi maxheartrate"}

        rest_heartrate = userRow["rest_hr"]
        if rest_heartrate is None:
            return {"message": "chybi restheartrate"}

        result_HRR = max_heartrate - rest_heartrate

        upsert_user_metrics(conn, user_id, hrr=result_HRR)



    return {
        "rest_heartrate": rest_heartrate,
        "max_heartrate": max_heartrate,
        "result_HRR": result_HRR,
    }


@app.get("/IntesityCalcul")
def read_root(user_id: int):
    with get_conn() as conn:
        userRow = conn.execute(
            """
            SELECT u.max_hr, u.rest_hr, m.hrr, m.estimated_vo2max
            FROM users u LEFT JOIN user_metrics m ON m.user_id = u.id
            WHERE u.id = %s
            """,
            (user_id,),
        ).fetchone()

        if not userRow:
            return {"message": "chybi user"}

        max_heartrate = userRow["max_hr"]
        if max_heartrate is None:
            return {"message": "chybi maxheartrate"}

        rest_heartrate = userRow["rest_hr"]
        if rest_heartrate is None:
            return {"message": "chybi restheartrate"}

        hrr = userRow["hrr"]
        if hrr is None:
            return {"message": "chybi hrr"}

        estimated_vo2max = userRow["estimated_vo2max"]
        if estimated_vo2max is None:
            return {"message": "chybi estimated_vo2max"}

        Avghr_rows = conn.execute(
            "SELECT id, avg_hr, sport_type FROM activities WHERE user_id = %s", (user_id,)
        ).fetchall()

        if not Avghr_rows:
            return {"message": "chybi Avghr_rows"}

        intenzita = []

        for Activity in Avghr_rows:
            if Activity["avg_hr"] is None:
                continue

            intenzita_value = round((Activity["avg_hr"] - rest_heartrate) / hrr, 3)
            estimated_vo2 = round(3.5 + intenzita_value * (estimated_vo2max - 3.5), 3)

            intenzita.append({
                "id": Activity["id"],
                "intenzita": intenzita_value,
                "estimated_vo2": estimated_vo2,
            })

            # ukladame jen u behu (stejne jako drive)
            if Activity["sport_type"] == "run":
                upsert_activity_metrics(conn, Activity["id"], intensity=intenzita_value, estimated_vo2=estimated_vo2)


    return {
        "rest_heartrate": rest_heartrate,
        "max_heartrate": max_heartrate,
        "intenzita": intenzita,
        
    }



@app.get("/Trimp")
def read_root(user_id: int):
    with get_conn() as conn:
        userDataRAW = conn.execute("SELECT max_hr, rest_hr FROM users WHERE id = %s", (user_id,)).fetchone()

        if not userDataRAW:
            return {"message": "chybi userData"}

        ActvityDataRAW = conn.execute(
            "SELECT id, moving_time_s, avg_hr FROM activities WHERE user_id = %s", (user_id,)
        ).fetchall()

        if not ActvityDataRAW:
            return {"message": "chybi ActvityDataRAW"}

        HR_rest = userDataRAW["rest_hr"]
        HR_max = userDataRAW["max_hr"]

        for activity in ActvityDataRAW:
            if activity["avg_hr"] is None or activity["moving_time_s"] is None:
                continue

            # Výpočet TRIMP pro každou aktivitu
            T = round(activity["moving_time_s"] / 60)  # Přepočet na minuty
            HR_ex = activity["avg_hr"]

            # Aplikace vzorce pro TRIMP
            trimp = round(T * ((HR_ex - HR_rest) / (HR_max - HR_rest)) ** 1.92 * 0.64 * math.e, 3)

            upsert_activity_metrics(conn, activity["id"], trimp=trimp)



    return {
        "userData": userDataRAW,
        "ActvityData": ActvityDataRAW,

    }




@app.get("/ACWR")
def read_root(user_id: int):
    with get_conn() as conn:
        activityRowsRAW = conn.execute(
            """
            SELECT m.trimp, a.started_at
            FROM activities a JOIN activity_metrics m ON m.activity_id = a.id
            WHERE a.user_id = %s AND m.trimp IS NOT NULL
            """,
            (user_id,),
        ).fetchall()

        if not activityRowsRAW:
            return {"message": "chybi activityRowsRAW"}

        today = datetime.today()

        acuteTrimp = []
        chronicTrimp = []

        for row in activityRowsRAW:
            activityDate = row["started_at"].replace(tzinfo=None)

            daysAgo = (today - activityDate).days

            if daysAgo <= 7:
                acuteTrimp.append(row["trimp"])
            if daysAgo <= 28:
                chronicTrimp.append(row["trimp"])

        acuteLoad = sum(acuteTrimp)

        if not chronicTrimp:
            return {"message": "chybi chronicTrimp"}

        chronicLoad = sum(chronicTrimp) / 4
        ACWR = round(acuteLoad / chronicLoad, 3)

        upsert_user_metrics(conn, user_id, acwr=ACWR)

    return {
        "ACWR": ACWR,
        "updated_rows": 1,
    }




@app.get("/avg")
def read_root(user_id: int):
    with get_conn() as conn:
        ActivityRaw = conn.execute(
            "SELECT id, distance_m, moving_time_s FROM activities WHERE user_id = %s AND sport_type = 'run'",
            (user_id,),
        ).fetchall()

        if not ActivityRaw:
            return {"message": "chybi activityRowsRAW"}

        tempo = None
        for actvity in ActivityRaw:
            # beh bez vzdalenosti nebo casu nema tempo (a deleni nulou by spadlo)
            if not actvity["distance_m"] or not actvity["moving_time_s"]:
                continue
            tempo = round((actvity["moving_time_s"] / 60) / (actvity["distance_m"] / 1000), 3)
            upsert_activity_metrics(conn, actvity["id"], pace_min_per_km=tempo)


    return {
        "avarage_tempo": tempo,
    }



@app.get("/ai")
def read_root(user_id: int):

    endpoint = AZURE_OPENAI_ENDPOINT
    deployment_name = AZURE_OPENAI_DEPLOYMENT
    api_key = AZURE_OPENAI_API_KEY

    twenty_eight_days_ago = datetime.today() - timedelta(days=28)
    today = datetime.today()

    # 1) cteni z databaze
    with get_conn() as conn:
        ActivityRaw = conn.execute(
            """
            SELECT a.started_at AS start_date, m.trimp
            FROM activities a LEFT JOIN activity_metrics m ON m.activity_id = a.id
            WHERE a.user_id = %s AND a.started_at >= %s
            ORDER BY a.started_at DESC
            """,
            (user_id, twenty_eight_days_ago),
        ).fetchall()

        if not ActivityRaw:
            return {"message": "chybi activityRowsRAW"}

        RawUserData = conn.execute(
            "SELECT acwr AS \"ACWR\", estimated_vo2max FROM user_metrics WHERE user_id = %s", (user_id,)
        ).fetchone()

        if not RawUserData or RawUserData["ACWR"] is None:
            return {"message": "chybi ACWR"}

        last_two_activities_raw = conn.execute(
            "SELECT started_at AS start_date FROM activities WHERE user_id = %s ORDER BY started_at DESC LIMIT 2",
            (user_id,),
        ).fetchall()

    activities = [dict(row) for row in ActivityRaw]

    # datum neni v JSON primo podporovane -> default=str ho prevede na text
    JsonActivity = json.dumps(activities, ensure_ascii=False, default=str)

    ACWR = RawUserData["ACWR"]
    estimated_vo2max = RawUserData["estimated_vo2max"]

    lastActivityDay = activities[0]["start_date"].replace(tzinfo=None)

    DaysFromLastActivity = (today - lastActivityDay).days


    NotTrainingForLong = DaysFromLastActivity >= 14
    UnderTrainingRisk = ACWR < 0.8

    GapBetweenLastTwoActivities = None
    ReturningAfterLongBreak = False

    if len(last_two_activities_raw) >= 2:
        last_activity_date = last_two_activities_raw[0]["start_date"].replace(tzinfo=None)
        previous_activity_date = last_two_activities_raw[1]["start_date"].replace(tzinfo=None)

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

    if ACWR > 1.5 and not ReturningAfterLongBreak:
        StatusFromMetrics = "elevated"

    if ACWR > 2.0 and not ReturningAfterLongBreak:
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
                "content": f"Pracuj pouze s těmito vstupy. Nic nepřidávej a nic neodhaduj. Pokud nějaký údaj není přímo ve vstupu, nesmí se objevit ve výstupu. Nepoužívej časové formulace jako 'v posledním týdnu', 'před týdnem' nebo 'nedávno', pokud je nelze přesně odvodit ze vstupu. Vysoké ACWR samo o sobě neznamená potvrzené přetížení ani zákaz dalšího běhu. Pokud nejsou přítomné další negativní signály, interpretuj vysoké ACWR spíše jako zvýšenou opatrnost a potřebu rozumné regulace další zátěže, ne jako akutní problém. Pokud backend_risks obsahuje alespoň jednu položku, nesmíš ve summary ani v risks tvrdit, že žádná rizika nejsou přítomná. Backend_risks ber jako závazná fakta. Pokud je estimated_vo2max dostupne, zohledni ho ve summary a actions jako orientacni ukazatel aerobni vykonnosti. Nestaci jen uvest cislo. Strucne vysvetli, co dana hodnota znamena pro bezce v praktickem kontextu vytrvalosti nebo aerobni vykonnosti. Nepopisuj ji jako laboratorni mereni, ale jako odhad. Vstup 1 - recent_activities JSON: {JsonActivity}. Vstup 2 - ACWR: {ACWR}. Vstup 3 - days_since_last_activity: {DaysFromLastActivity}. Vstup 4 - not_training_for_long: {NotTrainingForLong}. Vstup 5 - undertraining_risk: {UnderTrainingRisk}. Vstup 6 - gap_between_last_two_activities: {GapBetweenLastTwoActivities}. Vstup 7 - returning_after_long_break: {ReturningAfterLongBreak}. Vstup 8 - status_from_metrics: {StatusFromMetrics}. Vstup 9 - backend_risks: {BackendRisks}. Vstup 10 - estimated_vo2max: {estimated_vo2max}. Na základě pouze těchto vstupů vrať požadovaný JSON.",
            },
        ],

    
        response_format={"type": "json_object"},

    )

    x = completion.choices[0].message

    parsed_response = json.loads(x.content)
    parsed_response["status"] = StatusFromMetrics

    ai_badge = badge_from_status(parsed_response.get("status"))

    # 2) zapis vysledku - kazde hodnoceni je novy radek, takze zustava i historie
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO ai_insights (user_id, status, badge, headline, summary, risks, actions)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                parsed_response.get("status"),
                ai_badge,
                parsed_response.get("headline"),
                parsed_response.get("summary"),
                Jsonb(parsed_response.get("risks", [])),
                Jsonb(parsed_response.get("actions", [])),
            ),
        )


    return {
        "response": parsed_response,
    }







@app.get("/aiTraining")
def read_root(user_id: int, activity_id: int):
    endpoint = AZURE_OPENAI_ENDPOINT
    deployment_name = AZURE_OPENAI_DEPLOYMENT
    api_key = AZURE_OPENAI_API_KEY

    # 1) cteni z databaze (aliasy AS drzi stejne nazvy, jake AI dostavala drive)
    with get_conn() as conn:
        activity_row = conn.execute(
            """
            SELECT a.id, a.name, a.distance_m AS distance, a.moving_time_s AS moving_time,
                   a.elapsed_time_s AS elapsed_time, a.sport_type AS type, a.started_at AS start_date,
                   a.avg_hr AS average_heartrate, a.max_hr AS max_heartrate,
                   m.intensity, m.trimp, m.pace_min_per_km, m.estimated_vo2
            FROM activities a LEFT JOIN activity_metrics m ON m.activity_id = a.id
            WHERE a.user_id = %s AND a.id = %s
            """,
            (user_id, activity_id),
        ).fetchone()

        if not activity_row:
            return {"message": "chybi activity"}

        metrics_row = conn.execute(
            "SELECT acwr AS \"ACWR\" FROM user_metrics WHERE user_id = %s", (user_id,)
        ).fetchone()

        # posledni hodnoceni celeho uzivatele (activity_id IS NULL)
        dashboard_row = conn.execute(
            """
            SELECT status AS ai_status, badge AS ai_badge, headline AS ai_headline, summary AS ai_summary,
                   risks AS ai_risks, actions AS ai_actions, created_at AS ai_updated_at
            FROM ai_insights
            WHERE user_id = %s AND activity_id IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()

        previous_activity_row = conn.execute(
            """
            SELECT started_at AS start_date
            FROM activities
            WHERE user_id = %s AND started_at < %s
            ORDER BY started_at DESC
            LIMIT 1
            """,
            (user_id, activity_row["start_date"]),
        ).fetchone()

        distance = activity_row["distance"]
        recent_runs_raw = []
        if distance:
            recent_runs_raw = conn.execute(
                """
                SELECT a.id, a.user_id, a.name, a.distance_m AS distance, a.moving_time_s AS moving_time,
                       a.elapsed_time_s AS elapsed_time, a.sport_type AS type, a.started_at AS start_date,
                       m.pace_min_per_km, a.created_at
                FROM activities a LEFT JOIN activity_metrics m ON m.activity_id = a.id
                WHERE a.user_id = %s AND a.sport_type = 'run' AND a.id != %s AND a.distance_m BETWEEN %s AND %s
                ORDER BY a.started_at DESC
                LIMIT 5
                """,
                (user_id, activity_id, distance * 0.8, distance * 1.2),
            ).fetchall()

    activity = dict(activity_row)
    json_activity = json.dumps(activity, ensure_ascii=False, default=str)

    ACWR = metrics_row["ACWR"] if metrics_row else None
    dashboard_ai_context = dict(dashboard_row) if dashboard_row else {}
    json_dashboard_ai_context = json.dumps(dashboard_ai_context, ensure_ascii=False, default=str)

    pace_min_per_km = activity['pace_min_per_km']

    current_activity_date = activity["start_date"].replace(tzinfo=None)

    GapBeforeThisActivity = None
    ReturningAfterLongBreakForThisRun = False

    if previous_activity_row:
        previous_activity_date = previous_activity_row["start_date"].replace(tzinfo=None)
        GapBeforeThisActivity = (current_activity_date - previous_activity_date).days
        if GapBeforeThisActivity >= 14:
            ReturningAfterLongBreakForThisRun = True

    RecentRuns = [dict(row) for row in recent_runs_raw]

    RecentPaces = []

    for run in RecentRuns:
        if run["pace_min_per_km"] is not None:
            RecentPaces.append(run["pace_min_per_km"])

    if len(RecentPaces) < 2:
        paceBaseline = None
    else:
        paceBaseline = round(sum(RecentPaces) / len(RecentPaces), 3)

    if paceBaseline is not None and pace_min_per_km is not None:
        paceDelta = round(pace_min_per_km - paceBaseline, 3)
    else:
        paceDelta = None
    
    json_recent_runs = json.dumps(RecentRuns, ensure_ascii=False, default=str)

    if paceDelta is None:
        paceVsBaseline = "unknown"
    elif paceDelta < 0:
        paceVsBaseline = "faster"
    elif paceDelta > 0:
        paceVsBaseline = "slower"
    else:
        paceVsBaseline = "similar"


    if activity["trimp"] is not None and activity["moving_time"]:
        trimp_per_minute = round(activity["trimp"] / (activity["moving_time"] / 60), 3)
    else:
        trimp_per_minute = None



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
                "content": AZURE_OPENAI_SYSTEM_PROMPT2,
            },
            {
                "role": "user",
                "content": f"Vyhodnocuj pouze tento jeden konkretni beh. Nic nepridavej a nic neodhaduj mimo poskytnute vstupy. Pokud nejaky udaj ve vstupech chybi, nereportuj vymyslena cisla ani zavery. Zamer se jen na: 1. jak narocny tento beh byl, 2. jestli byl vzhledem k tepu efektivni nebo ne, 3. jak zapada do podobnych behu, 4. co z nej plyne pro dalsi 1 az 2 dny. Pokud jsou k dispozici podobne behy, paceBaseline a paceDelta, pouzij je jako hlavni kontext pro srovnani. Interpretace paceDelta je zavazna: zaporne paceDelta znamena rychlejsi beh nez baseline, kladne paceDelta znamena pomalejsi beh nez baseline. Tuto interpretaci nesmis obratit. Pace vs baseline uz bylo backendove vyhodnoceno jako: {paceVsBaseline}. Pokud ReturningAfterLongBreakForThisRun = True, interpretuj tento beh jako navrat po delsi pauze a netvrd ho stejne jako beh v bezne kontinualni treninkove sekvenci. GapBeforeThisActivity ber jako zavazny kontext. Pro hodnoceni narocnosti musis zohlednit nejen tempo a tep, ale i TRIMP a trimp_per_minute, pokud jsou k dispozici. Pokud je estimated_vo2 dostupne, zohledni ho jako doplnkovy ukazatel aerobni narocnosti konkretniho behu. ACWR pouzij jen jako doplnkovy kontext celkove zateze, ne jako jediny zaver o tomto jednom behu. Pokud je dostupny posledni dashboard AI insight, ber ho pouze jako doplnkovy kontext a pokud je v rozporu s aktualnimi metrikami tohoto behu, rid se aktualnimi metrikami. Nevypisuj surove nazvy metrik ani interni identifikatory jako paceDelta nebo trimp_per_minute do finalniho textu. Metriky interpretuj lidsky. Je zakazano tvrdit, naznacovat nebo doporucovat, ze muze jit o chybu, nespolehlivost nebo podezrelost mereni tepu. Tento typ zaveru neni povolen, protoze ve vstupech neni zadny explicitni dukaz o kvalite nebo chybe HR mereni. Samotna hodnota average_heartrate ani vztah mezi tepem, tempem a TRIMP neni dukaz chyby mereni. Toto omezeni plati bez vyjimky pro summary, risks i actions. Vstup 1 - activity JSON: {json_activity}. Vstup 2 - ACWR: {ACWR}. Vstup 3 - recent_runs JSON: {json_recent_runs}. Vstup 4 - recent_paces: {RecentPaces}. Vstup 5 - paceBaseline: {paceBaseline}. Vstup 6 - paceDelta: {paceDelta}. Vstup 7 - pace_vs_baseline: {paceVsBaseline}. Vstup 8 - trimp_per_minute: {trimp_per_minute}. Vstup 9 - gap_before_this_activity: {GapBeforeThisActivity}. Vstup 10 - returning_after_long_break_for_this_run: {ReturningAfterLongBreakForThisRun}. Vstup 11 - latest_dashboard_ai_context JSON: {json_dashboard_ai_context}. Vrat pouze pozadovany JSON.",
            },
        ],
        response_format={"type": "json_object"},
    )

    x = completion.choices[0].message
    parsed_response = json.loads(x.content)

    parsed_risks = parsed_response.get("risks", [])
    ai_badge = badge_from_activity_insight(parsed_response.get("effort"), parsed_risks)

    # 2) zapis vysledku
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO ai_insights (user_id, activity_id, badge, headline, summary, effort, risks, actions)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                activity_id,
                ai_badge,
                parsed_response.get("headline"),
                parsed_response.get("summary"),
                parsed_response.get("effort"),
                Jsonb(parsed_risks),
                Jsonb(parsed_response.get("actions", [])),
            ),
        )

    return {"response": parsed_response}





@app.get("/VO2MaxCalcul")
def read_root(user_id: int):
    conn = get_conn()

    userDataRAW = conn.execute(
        """
        SELECT u.rest_hr, m.hrr
        FROM users u LEFT JOIN user_metrics m ON m.user_id = u.id
        WHERE u.id = %s
        """,
        (user_id,),
    ).fetchone()

    if not userDataRAW:
        conn.close()
        return {"message": "chybi userData"}

    rest_heartrate = userDataRAW["rest_hr"]
    hrr = userDataRAW["hrr"]

    if rest_heartrate is None or hrr is None or hrr <= 0:
        conn.close()
        return {"message": "chybi rest_heartrate nebo hrr"}

    def load_candidates(window_days: int):
        since_date = datetime.today() - timedelta(days=window_days)

        # aliasy AS drzi stare nazvy, aby zbytek vypoctu zustal stejny
        activity_rows = conn.execute(
            """
            SELECT moving_time_s AS moving_time, avg_hr AS average_heartrate, distance_m AS distance,
                   avg_speed_ms AS average_speed, started_at AS start_date, elevation_gain_m AS "Elevation", id
            FROM activities
            WHERE user_id = %s AND sport_type = 'run' AND started_at >= %s
            """,
            (user_id, since_date),
        ).fetchall()

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
            if activity["Elevation"] is not None:
                elevation_per_km = activity["Elevation"] / (activity["distance"] / 1000)

                if elevation_per_km > 20:
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

    upsert_user_metrics(conn, user_id, estimated_vo2max=EstimatedVO2MaxFinal, estimated_vo2max_at=datetime.now().astimezone())

    conn.commit()
    conn.close()


    return {
        "estimated_vo2max": EstimatedVO2MaxFinal,
        "source_window_days": source_window_days,
        "fresh": fresh,
        "candidates_count": len(VO2MaxCandidates),
        "VO2MaxCandidates": VO2MaxCandidates,
    }
