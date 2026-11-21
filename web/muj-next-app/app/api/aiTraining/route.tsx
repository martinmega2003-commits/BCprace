import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const activityId = new URL(req.url).searchParams.get("activity_id");

    if (!activityId || !/^\d+$/.test(activityId)) {
        return NextResponse.json({ ok: false, message: "missing activityId" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ ok: false, message: "Nejsi prihlaseny" }, { status: 401 });
    }

    const pythonCall = await fetch(
        `${pythonApiUrl}/aiTraining?user_id=${user.id}&activity_id=${encodeURIComponent(activityId)}`,
    );

    if (!pythonCall.ok) {
        return NextResponse.json({ ok: false, message: "missing PythonCall" }, { status: 400 });
    }

    const result = await pythonCall.json();
    return NextResponse.json(result);
}
