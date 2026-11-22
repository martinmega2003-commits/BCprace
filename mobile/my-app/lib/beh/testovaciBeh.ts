import * as Crypto from 'expo-crypto';
import { GpsBod } from './vypocty';
import { HotovyBeh } from './poslednibeh';

// Umely beh jen pro vyvoj (aby se nemuselo behat venku):
// ~2,5 km tempem ~5:30/km, uprostred 60 s pauza (druhy segment), mirne zakrivena trasa.
export function vytvorTestovaciBeh(): HotovyBeh {
    const RYCHLOST_MS = 3.03          // ~5:30 na km
    const METRU_NA_STUPEN_SIRKY = 111195
    const POCET_BODU = 825            // 1 bod za sekundu, ~2,5 km
    const PAUZA_PO_BODU = 400         // po tomhle bodu se "zastavi" na 60 s
    const DELKA_PAUZY_S = 60

    const zacatek = Date.now() - (POCET_BODU + DELKA_PAUZY_S) * 1000
    const body: GpsBod[] = []

    let segment = 0
    let posunutiCasuMs = 0

    for (let i = 0; i < POCET_BODU; i = i + 1) {
        if (i === PAUZA_PO_BODU) {
            segment = 1
            posunutiCasuMs = DELKA_PAUZY_S * 1000
        }

        const ujetoM = i * RYCHLOST_MS
        body.push({
            cas: zacatek + i * 1000 + posunutiCasuMs,
            lat: 50.0755 + ujetoM / METRU_NA_STUPEN_SIRKY,
            lon: 14.4378 + 0.004 * Math.sin(ujetoM / 600),
            presnost: 5,
            segment: segment,
        })
    }

    return {
        externalId: Crypto.randomUUID(),
        zacatek: zacatek,
        celkovyCasS: POCET_BODU + DELKA_PAUZY_S,
        casPohybuS: POCET_BODU,
        body: body,
    }
}
