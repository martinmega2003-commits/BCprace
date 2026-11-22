// Jeden bod trasy z GPS.
export type GpsBod = {
  cas: number;       // kdy byl bod zmeren (ms od 1. 1. 1970, jako Date.now())
  lat: number;       // zemepisna sirka
  lon: number;       // zemepisna delka
  presnost: number;  // presnost v metrech (cim mensi, tim lepsi)
  segment: number;   // cislo useku: po kazde pauze +1
};

export function vzdalenostMeziBody(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    
    const POLOMERZEME = 6371000

    const rozdil_sirek = (a.lat-b.lat)*Math.PI/180
    const rozdil_delek = (a.lon-b.lon)*Math.PI/180

    // sirky obou bodu v radianech (potrebuje je kosinus ve vzorci)
    const sirka_a = a.lat*Math.PI/180
    const sirka_b = b.lat*Math.PI/180

    const sinusPolovinySirek = Math.sin(rozdil_sirek / 2)
    const sinusPolovinyDelek = Math.sin(rozdil_delek / 2)

    // Haversinuv vzorec ("na druhou" = vynasobit samo sebou)
    const x = sinusPolovinySirek * sinusPolovinySirek
        + Math.cos(sirka_a) * Math.cos(sirka_b) * sinusPolovinyDelek * sinusPolovinyDelek

    return 2 * POLOMERZEME * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export const MAX_PRESNOST_M = 20

export function filtrujBody(body:GpsBod[]): GpsBod[]{
    const MAX_PRESNOST_M = 20
    const MAX_RYCHLOST_MS  = 10
    let result: GpsBod[]= []
    let LastAccepted: GpsBod | null = null



    for(const bod of body ){
        if(bod.presnost>MAX_PRESNOST_M){
            continue
        }

        if(LastAccepted != null && bod.cas <= LastAccepted.cas){
            continue
        }
    
        if (LastAccepted != null && bod.segment === LastAccepted.segment) {
            const casSekundy = (bod.cas - LastAccepted.cas) / 1000
            const rychlost = vzdalenostMeziBody(LastAccepted, bod) / casSekundy
            if (rychlost > MAX_RYCHLOST_MS) {
                continue
            }
        }

        result.push(bod)
        LastAccepted = bod
    }
    return result
}

export function celkovaVzdalenost(body: GpsBod[]): number {
    
    let celkem = 0
    let LastAccepted: GpsBod | null = null

    for(const bod of body ){
        if(LastAccepted == null){
            LastAccepted = bod 
            continue
        }
        if(bod.segment === LastAccepted.segment){
        celkem += vzdalenostMeziBody(bod,LastAccepted)
        }
        LastAccepted = bod 
    }


    return celkem
}


export function casPohybuZBodu(body: GpsBod[]): number {
    let cas = 0
    let LastAccepted: GpsBod | null = null

    for(const bod of body ){
        if(LastAccepted == null){
            LastAccepted = bod 
            continue
        }
        if(bod.segment === LastAccepted.segment){
            cas += (bod.cas - LastAccepted.cas) / 1000
        }
        LastAccepted = bod 
    }
    return cas

}

export function prumerneTempo(vzdalenost:number, cas:number):number | null {
    let prumer = null
    if(vzdalenost == 0 || cas == 0 ){
        return prumer
    }

    prumer = (cas/vzdalenost)*1000


    return prumer
}

export function formatTempa(tempo: number | null): string {
    if (tempo == null) {
        return "--:--"
    }

    const celkoveSekundy = Math.round(tempo)
    const minuty = Math.floor(celkoveSekundy / 60)
    const sekundy = celkoveSekundy % 60

    return `${minuty}:${String(sekundy).padStart(2, '0')}`
}


export function aktualniTempo(body: GpsBod[], cas:number):number | null{
    let vzdalenost = 0
    let soucetcasu = 0

    let LastAccepted: GpsBod | null = null

    for(const bod of body ){
        if (bod.cas < cas - 30_000) {
        continue
        }
        if(LastAccepted == null){
            LastAccepted = bod
        continue
        }
        if (bod.segment === LastAccepted.segment) {
            vzdalenost += vzdalenostMeziBody(LastAccepted, bod)
            soucetcasu += (bod.cas - LastAccepted.cas) / 1000
        }
        LastAccepted = bod
        }
    // za 30 s ani 20 m = bezec stoji, GPS jen poskakuje -> tempo nezobrazovat
    if (vzdalenost < 20) {
        return null
    }
    return prumerneTempo(vzdalenost,soucetcasu)
}


export function mezicasy(body: GpsBod[]): number[]{
    let result: number[] = []
    // vzdalenost a cas od zacatku aktualniho (jeste nedokonceneho) kilometru
    let vzdalenost = 0
    let cas = 0

    let LastAccepted: GpsBod | null = null

    for(const bod of body ){
        if(LastAccepted == null){
            LastAccepted = bod
            continue
        }
        if (bod.segment === LastAccepted.segment) {
            let delkaUseku = vzdalenostMeziBody(LastAccepted, bod)
            let casUseku = (bod.cas - LastAccepted.cas) / 1000

            // useku muze byt dost na to, aby prekrocil hranici km (i vic hranic najednou)
            while (vzdalenost + delkaUseku >= 1000) {
                // kolik metru chybelo do celeho km
                const chybi = 1000 - vzdalenost
                // jakou cast useku jsme potrebovali (napr. 20 m ze 100 m = 0.2)
                const pomer = chybi / delkaUseku
                // presny cas, kdy bezec km dobehl
                result.push(cas + pomer * casUseku)

                // zbytek useku se prenese do dalsiho km (nic se neztrati)
                delkaUseku = delkaUseku - chybi
                casUseku = casUseku - pomer * casUseku
                vzdalenost = 0
                cas = 0
            }

            vzdalenost += delkaUseku
            cas += casUseku
        }
        LastAccepted = bod
    }

    return result
}

// 75 s -> "1:15", 3725 s -> "1:02:05"
export function formatCasu(celkoveSekundy: number): string {
    const sekundy = Math.floor(celkoveSekundy)
    const hodiny = Math.floor(sekundy / 3600)
    const minuty = Math.floor((sekundy % 3600) / 60)
    const zbytek = sekundy % 60

    const minutyText = String(minuty).padStart(2, '0')
    const zbytekText = String(zbytek).padStart(2, '0')

    if (hodiny > 0) {
        return `${hodiny}:${minutyText}:${zbytekText}`
    }
    return `${minuty}:${zbytekText}`
}
