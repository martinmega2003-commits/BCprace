import { getCurrentUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db"



export async function GET(request: Request) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ ok: false, message: "Nejsi prihlaseny" }, { status: 401 });
    }  

    const adresa = new URL(request.url)
    const activityIdText = adresa.searchParams.get("activity_id")
    if (activityIdText === null) {
        return NextResponse.json({ error: "activity_id musi byt cislo" }, { status: 400 });
    }
    if (!/^\d+$/.test(activityIdText)) {
        return NextResponse.json({ error: "activity_id musi byt cislo" }, { status: 400 });
    }

    const odpoved = await pool.query(`SELECT id FROM activities WHERE id = $1 AND user_id = $2`,[activityIdText, user.id])
    
    if (odpoved.rows.length === 0){
        return NextResponse.json({ ok: false, message: "Beh nenalezen" }, { status: 404 })
    }
    const odpovedBody = await pool.query(
        `SELECT extract(epoch from recorded_at) * 1000 AS cas, lat, lon, accuracy_m AS presnost, segment
            FROM activity_points
            WHERE activity_id = $1
            ORDER BY seq`, [activityIdText])

    // "cas" prijde z DB jako text (numeric), appka cte cislo -> prevedeme
    const body = []
    for (let i = 0; i < odpovedBody.rows.length; i = i + 1) {
        const radek = odpovedBody.rows[i]
        body.push({
            cas: Number(radek.cas),
            lat: radek.lat,
            lon: radek.lon,
            presnost: radek.presnost,
            segment: radek.segment,
        })
    }

    return NextResponse.json({ ok: true, body: body })
}