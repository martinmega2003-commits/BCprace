import { queryOne } from "./db";

// Ochrana prihlaseni proti hadani hesla (brute force).
// Kazdy pokus o prihlaseni zapiseme do tabulky login_attempts.
// Kdyz je v poslednich 15 minutach prilis mnoho NEUSPESNYCH pokusu,
// prihlaseni na chvili zablokujeme (stav 429 = "prilis mnoho pozadavku").

const OKNO_MINUT = 15;
// na jeden ucet: utocnik zkousi hesla k jednomu e-mailu
const MAX_NEUSPECHU_NA_EMAIL = 7;
// z jedne IP adresy: utocnik zkousi jedno heslo na hodne e-mailu
const MAX_NEUSPECHU_NA_IP = 30;

/** Vrati IP adresu klienta. Lokalne (bez Azure) zadnou nedostaneme, pak "neznama". */
export function getClientIp(request: Request): string {
    // Azure pripisuje skutecnou IP klienta NA KONEC hlavicky x-forwarded-for.
    // Zacatek muze klient podvrhnout, proto bereme POSLEDNI adresu (stejne jako proxy.ts).
    const forwarded = request.headers.get("x-forwarded-for");
    if (!forwarded) {
        return "neznama";
    }

    const adresy = forwarded.split(",");
    const posledni = adresy[adresy.length - 1];
    return posledni.trim();
}

/** true = moc neuspesnych pokusu, prihlaseni ted nepoustet. */
export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
    const radek = await queryOne<{ na_email: number; na_ip: number }>(
        `SELECT
            count(*) FILTER (WHERE email = $1)::int AS na_email,
            count(*) FILTER (WHERE ip = $2)::int    AS na_ip
         FROM login_attempts
         WHERE success = false
           AND attempted_at > now() - make_interval(mins => $3)`,
        [email, ip, OKNO_MINUT],
    );
    if (!radek) {
        return false;
    }
    return radek.na_email >= MAX_NEUSPECHU_NA_EMAIL || radek.na_ip >= MAX_NEUSPECHU_NA_IP;
}

/** Zapise jeden pokus o prihlaseni (uspesny i neuspesny, i pro neexistujici e-mail). */
export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
    await queryOne(
        "INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)",
        [email, ip, success],
    );
}

/** Kolik minut ma klient pockat (posila se v hlavicce Retry-After v sekundach). */
export const BLOKACE_SEKUND = OKNO_MINUT * 60;
