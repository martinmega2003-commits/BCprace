import { NextRequest, NextResponse } from "next/server";
import { getSessionId, getUserIdFromSession } from "@/lib/session";

export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const activityId = new URL(req.url).searchParams.get("activity_id");
    const sessionID = getSessionId(req);

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "missing sessionID" }, { status: 400 });
    }

    if (!activityId || !/^\d+$/.test(activityId)) {
        return NextResponse.json({ ok: false, message: "missing activityId" }, { status: 400 });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "missing userRow" }, { status: 400 });
    }

    const pythonCall = await fetch(
        `${pythonApiUrl}/aiTraining?user_id=${userId}&activity_id=${encodeURIComponent(activityId)}`,
    );

    if (!pythonCall.ok) {
        return NextResponse.json({ ok: false, message: "missing PythonCall" }, { status: 400 });
    }

    const result = await pythonCall.json();
    return NextResponse.json(result);
}
