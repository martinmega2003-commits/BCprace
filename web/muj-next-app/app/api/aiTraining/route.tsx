import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const activityId = url.searchParams.get("activity_id");
    const sessionID = cookieSessionId || querySessionId;

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "missing sessionID" }, { status: 400 });
    }

    if (!activityId) {
        return NextResponse.json({ ok: false, message: "missing activityId" }, { status: 400 });
    }

    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?");
    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined;

    if (!userRow) {
        return NextResponse.json({ ok: false, message: "missing userRow" }, { status: 400 });
    }

    const pythonCall = await fetch(`${pythonApiUrl}/aiTraining?user_id=${userRow.user_id}&activity_id=${activityId}`);

    if (!pythonCall.ok) {
        return NextResponse.json({ ok: false, message: "missing PythonCall" }, { status: 400 });
    }

    const result = await pythonCall.json();
    return NextResponse.json(result);
}
