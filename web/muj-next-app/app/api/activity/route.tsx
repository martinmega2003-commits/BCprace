import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";


export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const activityId = url.searchParams.get("activity_id");
    const sessionID = cookieSessionId || querySessionId;

    if (!activityId) {
    return NextResponse.json({ ok: false, message: "Chybi activityId" });
    }

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }
    
    
    const paceExpression = "CASE WHEN Avg_speed IS NOT NULL THEN Avg_speed WHEN distance IS NOT NULL AND distance > 0 AND moving_time IS NOT NULL THEN moving_time / 60.0 / (distance / 1000.0) ELSE NULL END AS Avg_speed";
    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?");
    const SelectActivityStatement = db.prepare(`SELECT id, user_id, name, distance, moving_time, elapsed_time, type, start_date, average_cadence, average_speed, max_speed, average_heartrate, max_heartrate, intensity, trimp, ${paceExpression}, created_at FROM activities WHERE user_id = ? AND id = ? `)
    const SelectRecentRunsStatement = db.prepare(`SELECT id, user_id, name, distance, moving_time, elapsed_time, type, start_date, ${paceExpression}, created_at FROM activities WHERE user_id = ? AND type = 'Run' AND id != ? AND distance BETWEEN ? AND ? ORDER BY start_date DESC LIMIT 5`)

    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined;


    if (!userRow) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }
    const user = userRow.user_id

    const Activity = SelectActivityStatement.get(user, activityId) as {distance: number, Avg_speed: number | null} | undefined
    
    if (!Activity) {
        return NextResponse.json({ ok: false, message: "Chybi activity" });
        }

    const minDistance = Activity.distance * 0.8 
    const maxDistance = Activity.distance * 1.2


    const RecentRuns = SelectRecentRunsStatement.all(user, activityId, minDistance, maxDistance)
    
    const RecentPaces = RecentRuns.map((run:any)=> run.Avg_speed).filter((pace: number | null): pace is number => pace != null)

    if (Activity.Avg_speed == null || RecentPaces.length === 0) {
        return NextResponse.json({ ok: true, Activity, RecentRuns, paceBaseline: null, paceDelta: null });
    }

    const paceBaseline = RecentPaces.reduce((sum : number, pace: number ) => sum + pace, 0) / RecentPaces.length
    const paceDelta = Activity.Avg_speed - paceBaseline

    return NextResponse.json({ ok: true, Activity, RecentRuns, paceBaseline, paceDelta });

}
