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
        return NextResponse.json({ ok: false, message: "missing userRow" }, { status: 400 });
    }

    const pythonCall = await fetch(`${pythonApiUrl}/VO2MaxCalcul?user_id=${userId}`, {
        cache: "no-store",
    });

    if (!pythonCall.ok) {
        return NextResponse.json({ ok: false, message: "missing pythonCall" }, { status: 400 });
    }

    const result = await pythonCall.json();

    return NextResponse.json(result, {
        headers: {
            "Cache-Control": "no-store",
        },
    });
}
