import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const sessionID = cookieSessionId || querySessionId;

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "missing sessionID" }, { status: 400 });
    }

    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?");
    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined;

    if (!userRow) {
        return NextResponse.json({ ok: false, message: "missing userRow" }, { status: 400 });
    }

    const pythonCall = await fetch(`${pythonApiUrl}/VO2MaxCalcul?user_id=${userRow.user_id}`, {
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
