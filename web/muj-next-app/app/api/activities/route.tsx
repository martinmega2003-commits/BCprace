import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getSessionId, getUserIdFromSession } from "@/lib/session";

export async function GET(req: NextRequest) {
    const sessionID = getSessionId(req);
    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }

    const userId = await getUserIdFromSession(sessionID);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }

    // aliasy AS drzi nazvy poli, ktere mobilni aplikace zna ze SQLite
    const Activies = await query(
        `SELECT id, name, distance_m AS distance, moving_time_s AS moving_time, elapsed_time_s AS elapsed_time,
                initcap(sport_type) AS type, started_at AS start_date
         FROM activities
         WHERE user_id = $1 AND sport_type = 'run'
         ORDER BY started_at DESC`,
        [userId],
    );

    return NextResponse.json({ ok: true, Activies });
}
