import { NextRequest, NextResponse } from "next/server";
import { pool, query, queryOne } from "@/lib/db";
import { getSessionId, getUserIdFromSession } from "@/lib/session";

type StravaActivity = {
    id: number;
    name: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    type: string;
    start_date: string;
    average_cadence?: number;
    average_speed?: number;
    max_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    total_elevation_gain?: number;
};

// DOCASNE: stazeni aktivit ze Stravy (v kroku 0 se nahradi importem souboru a synchronizaci z telefonu)
export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const sessionID = getSessionId(req);
    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }

    const tokenRow = await queryOne<{ access_token: string | null }>(
        "SELECT access_token FROM strava_accounts WHERE user_id = $1",
        [userId],
    );

    if (!tokenRow?.access_token) {
        return NextResponse.json({ ok: false, message: "Chybi token" });
    }

    const rawActivities = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=100", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenRow.access_token}`,
        },
    });

    if (!rawActivities.ok) {
        return NextResponse.json({ ok: false, message: "Chybi rawActivities" });
    }

    const activities = (await rawActivities.json()) as StravaActivity[];

    if (activities.length === 0) {
        return NextResponse.json({ ok: false, message: "Chybi activities" });
    }

    const stravaActivityIds = activities.map((activity) => String(activity.id));
    const oldestFetchedActivity = activities.reduce((oldest, activity) =>
        new Date(activity.start_date) < new Date(oldest.start_date) ? activity : oldest,
    );

    // aktivity, ktere v nasi databazi jsou, ale na Strave uz ne (napr. smazane)
    const removedActivityCandidates = await query<{ external_id: string }>(
        `SELECT external_id
         FROM activities
         WHERE user_id = $1 AND source = 'strava' AND started_at >= $2 AND NOT (external_id = ANY($3::text[]))`,
        [userId, oldestFetchedActivity.start_date, stravaActivityIds],
    );

    for (const activity of activities) {
        // stejny beh ulozeny podruhe se jen aktualizuje (UNIQUE user_id + source + external_id)
        await pool.query(
            `INSERT INTO activities (user_id, source, external_id, sport_type, name, started_at,
                 elapsed_time_s, moving_time_s, distance_m, elevation_gain_m,
                 avg_hr, max_hr, avg_cadence, avg_speed_ms, max_speed_ms)
             VALUES ($1, 'strava', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (user_id, source, external_id) DO UPDATE SET
                 sport_type = EXCLUDED.sport_type, name = EXCLUDED.name, started_at = EXCLUDED.started_at,
                 elapsed_time_s = EXCLUDED.elapsed_time_s, moving_time_s = EXCLUDED.moving_time_s,
                 distance_m = EXCLUDED.distance_m, elevation_gain_m = EXCLUDED.elevation_gain_m,
                 avg_hr = EXCLUDED.avg_hr, max_hr = EXCLUDED.max_hr, avg_cadence = EXCLUDED.avg_cadence,
                 avg_speed_ms = EXCLUDED.avg_speed_ms, max_speed_ms = EXCLUDED.max_speed_ms`,
            [
                userId,
                String(activity.id),
                (activity.type ?? "unknown").toLowerCase(),
                activity.name,
                activity.start_date,
                activity.elapsed_time,
                activity.moving_time,
                activity.distance,
                activity.total_elevation_gain ?? null,
                activity.average_heartrate ?? null,
                activity.max_heartrate ?? null,
                activity.average_cadence ?? null,
                activity.average_speed ?? null,
                activity.max_speed ?? null,
            ],
        );
    }

    await fetch(`${pythonApiUrl}/CalHRmax?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/HRR?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/VO2MaxCalcul?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/IntesityCalcul?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/avg?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/Trimp?user_id=${userId}`);
    await fetch(`${pythonApiUrl}/ACWR?user_id=${userId}`);

    return NextResponse.json({
        ok: true,
        message: "sync probehl",
        removed_activity_candidates: removedActivityCandidates.map((activity) => Number(activity.external_id)),
    });
}
