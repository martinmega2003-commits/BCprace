import { NextResponse, NextRequest } from "next/server";
import { pool, queryOne } from "@/lib/db";
import { getSessionId, getUserIdFromSession } from "@/lib/session";

type ProfileRow = {
    username: string;
    profile_medium: string | null;
    sex: string | null;
    height_cm: number | null;
    birth_date: string | null;
    weight_kg: number | null;
    rest_heartrate: number | null;
    ACWR: number | null;
    ai_status: string | null;
    ai_badge: string | null;
    ai_headline: string | null;
    ai_summary: string | null;
    ai_risks: string | null;
    ai_actions: string | null;
    ai_updated_at: string | null;
};

export async function GET(req: NextRequest) {
    const sessionID = getSessionId(req);
    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }

    // profil + vypocitane metriky + posledni AI hodnoceni celeho uzivatele
    const profileRow = await queryOne<ProfileRow>(
        `SELECT u.username, u.avatar_url AS profile_medium, u.sex, u.height_cm, u.birth_date, u.weight_kg,
                u.rest_hr AS rest_heartrate, m.acwr AS "ACWR",
                i.status AS ai_status, i.badge AS ai_badge, i.headline AS ai_headline, i.summary AS ai_summary,
                i.risks::text AS ai_risks, i.actions::text AS ai_actions, i.created_at AS ai_updated_at
         FROM users u
         LEFT JOIN user_metrics m ON m.user_id = u.id
         LEFT JOIN LATERAL (
             SELECT * FROM ai_insights
             WHERE user_id = u.id AND activity_id IS NULL
             ORDER BY created_at DESC
             LIMIT 1
         ) i ON true
         WHERE u.id = $1`,
        [userId],
    );

    if (!profileRow) {
        return NextResponse.json({ ok: false, message: "Chybi profilerow" });
    }

    return NextResponse.json({ ok: true, ...profileRow });
}

export async function PATCH(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const sessionID = getSessionId(req);
    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Chybi userid" });
    }

    const body = await req.json();

    // prazdny text ("") neni platne datum ani cislo -> ulozit jako prazdnou hodnotu (NULL)
    const orNull = (value: unknown) => (value === "" || value === undefined ? null : value);

    await pool.query(
        "UPDATE users SET sex = $1, height_cm = $2, birth_date = $3, weight_kg = $4, rest_hr = $5 WHERE id = $6",
        [
            orNull(body.sex),
            orNull(body.height_cm),
            orNull(body.birth_date),
            orNull(body.weight_kg),
            orNull(body.rest_heartrate),
            userId,
        ],
    );

    await fetch(`${pythonApiUrl}/IntesityCalcul?user_id=${userId}`);

    return NextResponse.json({ ok: true, message: "vse probehlo ok" });
}
