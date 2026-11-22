import { HotovyBeh } from './poslednibeh';
import { celkovaVzdalenost, GpsBod } from './vypocty';
import { nactiToken } from '../token';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3000';

function slozTeloPozadavku(beh: HotovyBeh) {
    // iPhone muze vratit cas s desetinnou castí, server chce cele milisekundy
    const body: GpsBod[] = []
    for (let i = 0; i < beh.body.length; i = i + 1) {
        const bod = beh.body[i]
        body.push({
            cas: Math.round(bod.cas),
            lat: bod.lat,
            lon: bod.lon,
            presnost: bod.presnost,
            segment: bod.segment,
        })
    }

    return {
        external_id: beh.externalId,
        started_at: new Date(beh.zacatek).toISOString(),
        elapsed_time_s: Math.round(beh.celkovyCasS),
        moving_time_s: Math.round(beh.casPohybuS),
        distance_m: celkovaVzdalenost(beh.body),
        body: body,
    }
}

export async function ulozBeh(beh: HotovyBeh): Promise<void> {
    const token = await nactiToken()
    if (token === null) {
        throw new Error('Nejsi prihlaseny')
    }

    const odpoved = await fetch(`${API_BASE_URL}/api/runs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(slozTeloPozadavku(beh)),
    })

    if (odpoved.ok === false) {
        const textOdpovedi = await odpoved.text()
        throw new Error(`Ulozeni se nepodarilo (kod ${odpoved.status}): ${textOdpovedi}`)
    }
}

// body trasy ulozeneho behu (pro mapu v detailu); beh bez bodu (import z Health) vrati prazdne pole
export async function nactiBodyBehu(activityId: number): Promise<GpsBod[]> {
    const token = await nactiToken()
    if (token === null) {
        throw new Error('Nejsi prihlaseny')
    }

    const odpoved = await fetch(`${API_BASE_URL}/api/runs/points?activity_id=${activityId}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (odpoved.ok === false) {
        throw new Error(`Nacteni trasy se nepodarilo (kod ${odpoved.status})`)
    }

    const data = await odpoved.json()
    return data.body
}