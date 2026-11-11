import { NextRequest, NextResponse } from "next/server";
import { getSessionId, getUserIdFromSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const sessionID = getSessionId(req);
    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "missing sessionID" }, { status: 400 });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "missing MISSING uSERrOW" }, { status: 400 });
    }

    const PythonCall = await fetch(`${pythonApiUrl}/weeklyvolume/?user_id=${userId}`, {
        cache: "no-store",
    });
    if (!PythonCall.ok) {
        return NextResponse.json({ ok: false, message: "missing PythonCall" }, { status: 400 });
    }

    const Result = await PythonCall.json();
    return NextResponse.json(Result, {
        headers: {
            "Cache-Control": "no-store",
        },
    });
}
