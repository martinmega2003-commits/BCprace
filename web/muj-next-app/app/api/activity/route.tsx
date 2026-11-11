import { NextResponse, NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionId, getUserIdFromSession } from "@/lib/session";

// tempo: ulozena hodnota, jinak dopocitat z casu a vzdalenosti
const paceExpression = `COALESCE(
    m.pace_min_per_km,
    CASE WHEN a.distance_m > 0 AND a.moving_time_s IS NOT NULL
         THEN a.moving_time_s / 60.0 / (a.distance_m / 1000.0) END
)::float8 AS pace_min_per_km`;

export async function GET(req: NextRequest) {
    const activityId = new URL(req.url).searchParams.get("activity_id");
    const sessionID = getSessionId(req);

    // id musi byt cislo, jinak by databaze vratila chybu
    if (!activityId || !/^\d+$/.test(activityId)) {
        return NextResponse.json({ ok: false, message: "Chybi activityId" });
    }

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }

    // aktivita + jeji vypocitane metriky + posledni AI hodnoceni tohoto behu
    const Activity = await queryOne<{ distance: number | null; pace_min_per_km: number | null }>(
        `SELECT a.id, a.user_id, a.name, a.distance_m AS distance, a.moving_time_s AS moving_time,
                a.elapsed_time_s AS elapsed_time, initcap(a.sport_type) AS type, a.started_at AS start_date,
                a.avg_cadence AS average_cadence, a.avg_speed_ms AS average_speed, a.max_speed_ms AS max_speed,
                a.avg_hr AS average_heartrate, a.max_hr AS max_heartrate,
                m.intensity, m.trimp, m.estimated_vo2,
                i.badge AS ai_badge, i.headline AS ai_headline, i.summary AS ai_summary, i.effort AS ai_effort,
                i.risks::text AS ai_risks, i.actions::text AS ai_actions, i.created_at AS ai_updated_at,
                ${paceExpression}, a.created_at
         FROM activities a
         LEFT JOIN activity_metrics m ON m.activity_id = a.id
         LEFT JOIN LATERAL (
             SELECT * FROM ai_insights
             WHERE activity_id = a.id
             ORDER BY created_at DESC
             LIMIT 1
         ) i ON true
         WHERE a.user_id = $1 AND a.id = $2`,
        [userId, activityId],
    );

    if (!Activity) {
        return NextResponse.json({ ok: false, message: "Chybi activity" });
    }

    let RecentRuns: { pace_min_per_km: number | null }[] = [];

    if (Activity.distance) {
        RecentRuns = await query(
            `SELECT a.id, a.user_id, a.name, a.distance_m AS distance, a.moving_time_s AS moving_time,
                    a.elapsed_time_s AS elapsed_time, initcap(a.sport_type) AS type, a.started_at AS start_date,
                    ${paceExpression}, a.created_at
             FROM activities a
             LEFT JOIN activity_metrics m ON m.activity_id = a.id
             WHERE a.user_id = $1 AND a.sport_type = 'run' AND a.id != $2 AND a.distance_m BETWEEN $3 AND $4
             ORDER BY a.started_at DESC
             LIMIT 5`,
            [userId, activityId, Activity.distance * 0.8, Activity.distance * 1.2],
        );
    }

    const RecentPaces = RecentRuns
        .map((run) => run.pace_min_per_km)
        .filter((pace): pace is number => pace != null);

    if (Activity.pace_min_per_km == null || RecentPaces.length === 0) {
        return NextResponse.json({ ok: true, Activity, RecentRuns, paceBaseline: null, paceDelta: null });
    }

    const paceBaseline = RecentPaces.reduce((sum, pace) => sum + pace, 0) / RecentPaces.length;
    const paceDelta = Activity.pace_min_per_km - paceBaseline;

    return NextResponse.json({ ok: true, Activity, RecentRuns, paceBaseline, paceDelta });
}
