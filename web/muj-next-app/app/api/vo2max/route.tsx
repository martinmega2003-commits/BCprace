import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ ok: false, message: "Nejsi prihlaseny" }, { status: 401 });
    }

    const pythonCall = await fetch(`${pythonApiUrl}/VO2MaxCalcul?user_id=${user.id}`, {
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
