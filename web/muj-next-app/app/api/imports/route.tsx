import { NextRequest, NextResponse } from "next/server";
import { getSessionId, getUserIdFromSession } from "@/lib/session";
import { pool } from "@/lib/db";

const POVOLENE_ZDROJE = ["healthkit", "health_connect", "file"];

const MAX_AKTIVIT = 1000;

type ImportActivity = {
    external_id: string;
    sport_type: string;
    started_at: string;
    name?: string;
    timezone?: string;
    elapsed_time_s?: number;
    moving_time_s?: number;
    distance_m?: number;
    elevation_gain_m?: number;
    avg_hr?: number;
    max_hr?: number;
    avg_cadence?: number;
    avg_speed_ms?: number;
    max_speed_ms?: number;
    calories_kcal?: number;
    is_indoor?: boolean;
    source_app?: string;
    device_name?: string;
};

function hodnotaNeboNull(hodnota: unknown) {
    if (hodnota === undefined) {
        return null;
    }
    return hodnota;
}

function chybiPovinnePole(aktivita: ImportActivity): boolean {
    if (!aktivita.external_id) {
        return true;
    }
    if (!aktivita.sport_type) {
        return true;
    }
    if (!aktivita.started_at) {
        return true;
    }
    return false;
}

export async function POST(req: NextRequest) {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        return NextResponse.json({ ok: false, message: "Chybi session" }, { status: 401 });
    }

    const userId = await getUserIdFromSession(sessionId);
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Neplatna nebo vyprsela session" }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, message: "Telo pozadavku neni platny JSON" }, { status: 400 });
    }

    if (!POVOLENE_ZDROJE.includes(body.source)) {
        return NextResponse.json({ ok: false, message: "Neplatny zdroj" }, { status: 400 });
    }

    if (!Array.isArray(body.activities)) {
        return NextResponse.json({ ok: false, message: "activities musi byt seznam" }, { status: 400 });
    }

    if (body.activities.length > MAX_AKTIVIT) {
        return NextResponse.json({ ok: false, message: `Najednou lze poslat nejvys ${MAX_AKTIVIT} aktivit` }, { status: 400 });
    }

    const activities: ImportActivity[] = body.activities;

    for (const aktivita of activities) {
        if (chybiPovinnePole(aktivita)) {
            return NextResponse.json({ ok: false, message: "Aktivite chybi povinne pole (external_id, sport_type nebo started_at)" }, { status: 400 });
        }
    }

    for (const aktivita of activities) {
        await pool.query(
            `INSERT INTO activities (
                 user_id, source, external_id, sport_type, name, started_at, timezone,
                 elapsed_time_s, moving_time_s, distance_m, elevation_gain_m,
                 avg_hr, max_hr, avg_cadence, avg_speed_ms, max_speed_ms,
                 calories_kcal, is_indoor, source_app, device_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
             ON CONFLICT (user_id, source, external_id) DO UPDATE SET
                 sport_type = EXCLUDED.sport_type,
                 name = EXCLUDED.name,
                 started_at = EXCLUDED.started_at,
                 timezone = EXCLUDED.timezone,
                 elapsed_time_s = EXCLUDED.elapsed_time_s,
                 moving_time_s = EXCLUDED.moving_time_s,
                 distance_m = EXCLUDED.distance_m,
                 elevation_gain_m = EXCLUDED.elevation_gain_m,
                 avg_hr = EXCLUDED.avg_hr,
                 max_hr = EXCLUDED.max_hr,
                 avg_cadence = EXCLUDED.avg_cadence,
                 avg_speed_ms = EXCLUDED.avg_speed_ms,
                 max_speed_ms = EXCLUDED.max_speed_ms,
                 calories_kcal = EXCLUDED.calories_kcal,
                 is_indoor = EXCLUDED.is_indoor,
                 source_app = EXCLUDED.source_app,
                 device_name = EXCLUDED.device_name`,
            [
                userId,
                body.source,
                aktivita.external_id,
                aktivita.sport_type,
                hodnotaNeboNull(aktivita.name),
                aktivita.started_at,
                hodnotaNeboNull(aktivita.timezone),
                hodnotaNeboNull(aktivita.elapsed_time_s),
                hodnotaNeboNull(aktivita.moving_time_s),
                hodnotaNeboNull(aktivita.distance_m),
                hodnotaNeboNull(aktivita.elevation_gain_m),
                hodnotaNeboNull(aktivita.avg_hr),
                hodnotaNeboNull(aktivita.max_hr),
                hodnotaNeboNull(aktivita.avg_cadence),
                hodnotaNeboNull(aktivita.avg_speed_ms),
                hodnotaNeboNull(aktivita.max_speed_ms),
                hodnotaNeboNull(aktivita.calories_kcal),
                hodnotaNeboNull(aktivita.is_indoor),
                hodnotaNeboNull(aktivita.source_app),
                hodnotaNeboNull(aktivita.device_name),
            ],
        );
    }

    return NextResponse.json({ ok: true, count: activities.length });
}
