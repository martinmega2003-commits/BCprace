import { describe, expect, it } from 'vitest';
import {
  aktualniTempo,
  casPohybuZBodu,
  celkovaVzdalenost,
  filtrujBody,
  formatTempa,
  GpsBod,
  mezicasy,
  prumerneTempo,
  vzdalenostMeziBody,
} from '@/lib/beh/vypocty';

// 1 stupen zemepisne delky na rovniku = 2 * PI * 6 371 000 / 360 = 111 194,93 m
const STUPNU_NA_METR = 1 / 111194.93;

// Pomocny bod na rovniku: poradi * 100 m na vychod, poradi * 30 s od zacatku.
// Takze bod(0) -> bod(1) = 100 m za 30 s = tempo 5:00 /km.
// "upravy" prepisou jednotlive hodnoty (napr. horsi presnost, jiny cas, jiny segment).
function bod(poradi: number, upravy: Partial<GpsBod> = {}): GpsBod {
  const zaklad: GpsBod = {
    cas: poradi * 30000,
    lat: 0,
    lon: poradi * 100 * STUPNU_NA_METR,
    presnost: 5,
    segment: 0,
  };
  return { ...zaklad, ...upravy };
}

// ===== Task 1: vzdalenost mezi dvema body =====

describe('vzdalenostMeziBody', () => {
  it('dva body na rovniku 1 km od sebe', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 1000 * STUPNU_NA_METR };
    expect(vzdalenostMeziBody(a, b)).toBeCloseTo(1000, 0);
  });

  it('stejny bod ma vzdalenost 0', () => {
    const a = { lat: 49.2, lon: 16.6 };
    expect(vzdalenostMeziBody(a, a)).toBe(0);
  });

  it('Brno - Praha je zhruba 185 km', () => {
    const brno = { lat: 49.1951, lon: 16.6068 };
    const praha = { lat: 50.0755, lon: 14.4378 };
    const km = vzdalenostMeziBody(brno, praha) / 1000;
    expect(km).toBeGreaterThan(180);
    expect(km).toBeLessThan(190);
  });
});

// ===== Task 2: filtr spatnych bodu =====

describe('filtrujBody', () => {
  it('dobre body nechava', () => {
    const body = [bod(0), bod(1), bod(2)];
    expect(filtrujBody(body)).toHaveLength(3);
  });

  it('zahodi bod s presnosti horsi nez 20 m', () => {
    const body = [bod(0), bod(1, { presnost: 35 }), bod(2)];
    const vysledek = filtrujBody(body);
    expect(vysledek).toHaveLength(2);
    expect(vysledek[1].cas).toBe(60000);
  });

  it('zahodi skok GPS (400 m za 1 s)', () => {
    const skok = bod(5, { cas: 31000 });
    const body = [bod(0), bod(1), skok, bod(2)];
    expect(filtrujBody(body)).toHaveLength(3);
  });

  it('zahodi bod se stejnym nebo starsim casem', () => {
    const body = [bod(0), bod(1), bod(2, { cas: 30000 })];
    expect(filtrujBody(body)).toHaveLength(2);
  });

  it('po pauze (novy segment) rychlost nekontroluje', () => {
    // po pauze muze byt bezec o kus dal (napr. presel ulici), to neni skok GPS
    const body = [bod(0), bod(1), bod(20, { cas: 31000, segment: 1 })];
    expect(filtrujBody(body)).toHaveLength(3);
  });
});

// ===== Task 3: celkova vzdalenost a cas pohybu =====

describe('celkovaVzdalenost', () => {
  it('10 useku po 100 m = 1 km', () => {
    const body: GpsBod[] = [];
    for (let poradi = 0; poradi <= 10; poradi = poradi + 1) {
      body.push(bod(poradi));
    }
    expect(celkovaVzdalenost(body)).toBeCloseTo(1000, 0);
  });

  it('pres pauzu se vzdalenost nepocita', () => {
    // 0 -> 100 m, pauza (bezec se presune o 900 m), pak dalsich 100 m
    const body = [bod(0), bod(1), bod(10, { segment: 1 }), bod(11, { segment: 1 })];
    expect(celkovaVzdalenost(body)).toBeCloseTo(200, 0);
  });

  it('prazdny nebo jeden bod = 0', () => {
    expect(celkovaVzdalenost([])).toBe(0);
    expect(celkovaVzdalenost([bod(0)])).toBe(0);
  });
});

describe('casPohybuZBodu', () => {
  it('pres pauzu se cas nepocita', () => {
    const body = [bod(0), bod(1), bod(10, { segment: 1 }), bod(11, { segment: 1 })];
    expect(casPohybuZBodu(body)).toBe(60);
  });
});

// ===== Task 4: tempo =====

describe('tempo', () => {
  it('prumerne tempo 5 km za 25 min = 5:00 /km', () => {
    expect(prumerneTempo(5000, 1500)).toBe(300);
  });

  it('prumerne tempo bez vzdalenosti = null', () => {
    expect(prumerneTempo(0, 120)).toBeNull();
  });

  it('format tempa', () => {
    expect(formatTempa(300)).toBe('5:00');
    expect(formatTempa(359.6)).toBe('6:00');
    expect(formatTempa(305)).toBe('5:05');
    expect(formatTempa(null)).toBe('--:--');
  });

  it('aktualni tempo z poslednich 30 s: 100 m za 30 s = 5:00 /km', () => {
    const body = [bod(0), bod(1), bod(2), bod(3)];
    // ted = cas posledniho bodu; v okne 30 s jsou body 2 a 3
    expect(aktualniTempo(body, 90000)).toBeCloseTo(300, 0);
  });

  it('kdyz bezec stoji, aktualni tempo je null', () => {
    const stoji = [bod(0), bod(0, { cas: 10000 }), bod(0, { cas: 20000 })];
    expect(aktualniTempo(stoji, 20000)).toBeNull();
  });
});

// ===== Task 5: mezicasy po kilometrech =====

describe('mezicasy', () => {
  it('2,5 km rovnomerne (100 m za 30 s) = dva km po 300 s', () => {
    const body: GpsBod[] = [];
    for (let poradi = 0; poradi <= 25; poradi = poradi + 1) {
      body.push(bod(poradi));
    }
    const vysledek = mezicasy(body);
    expect(vysledek).toHaveLength(2);
    expect(vysledek[0]).toBeCloseTo(300, 0);
    expect(vysledek[1]).toBeCloseTo(300, 0);
  });

  it('pauza se do mezicasu nepocita', () => {
    // 600 m, pauza 10 minut (novy segment), dalsich 600 m -> prvni km trva 300 s pohybu
    const body: GpsBod[] = [];
    for (let poradi = 0; poradi <= 6; poradi = poradi + 1) {
      body.push(bod(poradi));
    }
    for (let poradi = 6; poradi <= 12; poradi = poradi + 1) {
      body.push(bod(poradi, { cas: poradi * 30000 + 600000, segment: 1 }));
    }
    const vysledek = mezicasy(body);
    expect(vysledek).toHaveLength(1);
    expect(vysledek[0]).toBeCloseTo(300, 0);
  });

  it('kratky beh (pod 1 km) nema zadny mezicas', () => {
    expect(mezicasy([bod(0), bod(1), bod(2)])).toEqual([]);
  });
});
