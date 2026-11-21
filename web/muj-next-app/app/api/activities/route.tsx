import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ ok: false, message: "Nejsi prihlaseny" }, { status: 401 });
    }

    // aliasy AS drzi nazvy poli, ktere mobilni aplikace zna ze SQLite
    const Activies = await query(
        `SELECT id, name, distance_m AS distance, moving_time_s AS moving_time, elapsed_time_s AS elapsed_time,
                initcap(sport_type) AS type, started_at AS start_date
         FROM activities
         WHERE user_id = $1 AND sport_type = 'run'
         ORDER BY started_at DESC`,
        [user.id],
    );

    return NextResponse.json({ ok: true, Activies });
}
