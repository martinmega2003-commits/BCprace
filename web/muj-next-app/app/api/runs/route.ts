import { ulozBehSchema } from "@/lib/runs";
import { getCurrentUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { prepocitatMetriky } from "@/lib/metrics";


export async function POST(request: Request) {
    // 1. kdo to posila (await! bez nej by "user" byl slib a podminka by pustila kohokoli)
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ ok: false, message: "Nejsi prihlaseny" }, { status: 401 });
    }

    // 2. precist telo (rozbity JSON -> 400)
    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: "telo pozadavku neni platny JSON" }, { status: 400 });
    }

    // 3. zkontrolovat data "formickou"
    const result = ulozBehSchema.safeParse(body)
    if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // 4. ulozeni v transakci: beh i vsechny body, nebo nic
    // (jedno pujcene spojeni -> vsechny dotazy jdou stejnou cestou)
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        // a) beh do activities (source 'app' = zaznamenano v nasi appce)
        const beh = result.data
        const vlozenyBeh = await client.query(
            `INSERT INTO activities (user_id, source, external_id, sport_type, name, started_at,
                 elapsed_time_s, moving_time_s, distance_m)
             VALUES ($1, 'app', $2, 'run', 'Běh', $3, $4, $5, $6)
             ON CONFLICT (user_id, source, external_id) DO NOTHING
             RETURNING id`,
            [user.id, beh.external_id, beh.started_at, beh.elapsed_time_s, beh.moving_time_s, beh.distance_m],
        )

        // nic se nevlozilo = tenhle beh uz ulozeny je (appka ho poslala znovu,
        // napr. kdyz se ji ztratila odpoved) -> neni to chyba, druhou kopii nedelame
        if (vlozenyBeh.rows.length === 0) {
            await client.query("ROLLBACK")
            return NextResponse.json({ ok: true, uz_ulozeno: true }, { status: 200 })
        }

        const activityId = vlozenyBeh.rows[0].id

        // b) sem prijde ulozeni bodu

        const poradi: number[] = []
        const casy: number[] = []
        const sirky: number[] = []
        const delky: number[] = []
        const presnosti: number[] = []
        const segmenty: number[] = []

        // rozdelit body "po sloupcich": kazde pole drzi jednu vlastnost vsech bodu
        for (let i = 0; i < beh.body.length; i = i + 1) {
            const bod = beh.body[i]
            poradi.push(i)
            casy.push(bod.cas)
            sirky.push(bod.lat)
            delky.push(bod.lon)
            presnosti.push(bod.presnost) 
            segmenty.push(bod.segment)
        }

        // vsechny body JEDNIM dotazem: unnest z poli udela radky
        // (1. prvek kazdeho pole = 1. radek, 2. prvky = 2. radek...)
        await client.query(
            `INSERT INTO activity_points (activity_id, seq, recorded_at, lat, lon, accuracy_m, segment)
             SELECT $1, seq, to_timestamp(cas_ms / 1000.0), lat, lon, presnost, segment
             FROM unnest($2::int[], $3::float8[], $4::float8[], $5::float8[], $6::float8[], $7::int[])
                  AS t(seq, cas_ms, lat, lon, presnost, segment)`,
            [activityId, poradi, casy, sirky, delky, presnosti, segmenty],
        )

        await client.query("COMMIT")
    } catch (chyba) {
        await client.query("ROLLBACK")
        throw chyba
    } finally {
        // spojeni vratit do poolu VZDY, jinak by po par pozadavcich dosla
        client.release()
    }

    // az po COMMIT: Python cte DB vlastnim spojenim a novy beh uvidi teprve ted
    await prepocitatMetriky(user.id)

    return NextResponse.json({ ok: true }, { status: 201 })
}
