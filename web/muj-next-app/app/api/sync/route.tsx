import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";


export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";
    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const sessionID = cookieSessionId || querySessionId;



    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }


    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?")
    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined


    if (!userRow) {
            return NextResponse.json({ ok: false, message: "Chybi userId" });
        }

    const selectTokenStatement = db.prepare("SELECT access_token FROM strava_tokens WHERE user_id = ?")
    const tokenRow = selectTokenStatement.get(userRow.user_id) as { access_token: string } | undefined

    if (!tokenRow) {
        return NextResponse.json({ ok: false, message: "Chybi token" });
    }

    const rawActivities = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=100", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenRow.access_token}`,
        },
    })

        if (!rawActivities.ok) {
        return NextResponse.json({ ok: false, message: "Chybi rawActivities" });
        }
        
        const activities = await rawActivities.json()

        if (activities.length === 0) {
        return NextResponse.json({ ok: false, message: "Chybi activities" });
        }

        const insertActivityUserStatment = db.prepare("INSERT INTO activities (id, user_id, name, distance, moving_time, elapsed_time, type, start_date, average_cadence, average_speed, max_speed, average_heartrate, max_heartrate, Elevation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, name = excluded.name, distance = excluded.distance, moving_time = excluded.moving_time, elapsed_time = excluded.elapsed_time, type = excluded.type, start_date = excluded.start_date, average_cadence = excluded.average_cadence, average_speed = excluded.average_speed, max_speed = excluded.max_speed, average_heartrate = excluded.average_heartrate, max_heartrate = excluded.max_heartrate, Elevation = excluded.Elevation")

        for (let i = 0; i < activities.length; i++) {
            const activity = activities[i]
            insertActivityUserStatment.run(
            activity.id,
            userRow.user_id,
            activity.name,
            activity.distance,
            activity.moving_time,
            activity.elapsed_time,
            activity.type,
            activity.start_date,
            activity.average_cadence,
            activity.average_speed,
            activity.max_speed,
            activity.average_heartrate,
            activity.max_heartrate,
            activity.total_elevation_gain,

            );
    }


    await fetch(`${pythonApiUrl}/CalHRmax?user_id=${userRow.user_id}`)
    await fetch(`${pythonApiUrl}/HRR?user_id=${userRow.user_id}`)
    await fetch(`${pythonApiUrl}/IntesityCalcul?user_id=${userRow.user_id}`)
    await fetch(`${pythonApiUrl}/avg?user_id=${userRow.user_id}`)
    await fetch(`${pythonApiUrl}/Trimp?user_id=${userRow.user_id}`)
    await fetch(`${pythonApiUrl}/awrs?user_id=${userRow.user_id}`)


return NextResponse.json({ ok: true, message: "sync probehl" });
    }