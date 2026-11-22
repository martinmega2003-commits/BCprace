import { GpsBod } from './vypocty';

export type HotovyBeh = {
    externalId: string;
    zacatek: number;
    celkovyCasS: number;
    casPohybuS: number;
    body: GpsBod[];
};

let posledniBeh: HotovyBeh | null = null


export function ulozPosledniBeh(beh: HotovyBeh): void {
    posledniBeh = beh
}

export function nactiPosledniBeh(): HotovyBeh | null {
    return posledniBeh
}

export function smazPosledniBeh(): void {
    posledniBeh = null
}