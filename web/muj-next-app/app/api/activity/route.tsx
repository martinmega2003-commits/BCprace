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
    
    
    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?");
    const SelectActivityStatement = db.prepare("SELECT id, name, distance, moving_time, elapsed_time, type, start_date, average_cadence, average_speed, max_speed, average_heartrate, max_heartrate FROM activities WHERE user_id = ? AND id = ? ")


    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined;


    if (!userRow) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }
    const user = userRow.user_id

    const Activity = SelectActivityStatement.get(user, activityId)
    
    if (!Activity) {
        return NextResponse.json({ ok: false, message: "Chybi activity" });
        }

    return NextResponse.json({ ok: true, Activity});
}