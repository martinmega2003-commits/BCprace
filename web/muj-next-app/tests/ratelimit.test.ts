import { afterEach, describe, expect, it, vi } from "vitest";
import { smiProjit, uklid, vytvorLimiter } from "@/lib/rateLimit";

const MINUTA = 60_000;

// ---------- smiProjit: cista funkce, cas zadavame sami ----------
describe("smiProjit (klouzave okno)", () => {
  it("pusti pozadavky do limitu a dalsi zablokuje", () => {
    const casy: number[] = [];
    expect(smiProjit(casy, 0, 2, MINUTA)).toBe(true);
    expect(smiProjit(casy, 1_000, 2, MINUTA)).toBe(true);
    expect(smiProjit(casy, 2_000, 2, MINUTA)).toBe(false);
  });

  it("po uplynuti okna od nejstarsiho pozadavku zase pusti", () => {
    const casy: number[] = [];
    smiProjit(casy, 0, 2, MINUTA);
    smiProjit(casy, 30_000, 2, MINUTA);

    expect(smiProjit(casy, 59_999, 2, MINUTA)).toBe(false); // nejstarsi (cas 0) je jeste v okne
    expect(smiProjit(casy, 60_000, 2, MINUTA)).toBe(true); // ted uz vypadl -> misto se uvolnilo
  });

  it("klouzave okno: na prelomu minut nejde poslat dvojnasobek", () => {
    // u pevneho okna by slo poslat 2 pozadavky v 0:59 a dalsi 2 v 1:00 (= 4 za 1 sekundu)
    const casy: number[] = [];
    expect(smiProjit(casy, 59_000, 2, MINUTA)).toBe(true);
    expect(smiProjit(casy, 59_500, 2, MINUTA)).toBe(true);
    expect(smiProjit(casy, 60_000, 2, MINUTA)).toBe(false);
    expect(smiProjit(casy, 60_500, 2, MINUTA)).toBe(false);
  });

  it("zablokovany pozadavek se nepocita do limitu", () => {
    const casy: number[] = [];
    smiProjit(casy, 0, 1, MINUTA);
    smiProjit(casy, 10_000, 1, MINUTA); // zablokovany -> nesmi se ulozit
    smiProjit(casy, 20_000, 1, MINUTA); // zablokovany

    expect(casy).toEqual([0]);
    expect(smiProjit(casy, 60_000, 1, MINUTA)).toBe(true); // jinak by cekal az do 80 000
  });
});

// ---------- uklid ----------
describe("uklid", () => {
  it("smaze IP bez pozadavku v okne a aktivni necha", () => {
    const pamet = new Map<string, number[]>([
      ["stara", [0]],
      ["aktivni", [50_000]],
    ]);

    uklid(pamet, 70_000, MINUTA);

    expect([...pamet.keys()]).toEqual(["aktivni"]);
  });
});

// ---------- vytvorLimiter: cely limiter, cas ovladame pres falesne hodiny ----------
describe("vytvorLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pusti 3 pozadavky a ctvrty zablokuje", () => {
    const smiProjit = vytvorLimiter(3, MINUTA);
    expect(smiProjit("1.2.3.4")).toBe(true);
    expect(smiProjit("1.2.3.4")).toBe(true);
    expect(smiProjit("1.2.3.4")).toBe(true);
    expect(smiProjit("1.2.3.4")).toBe(false);
  });

  it("kazda IP ma vlastni pocitadlo", () => {
    const smiProjit = vytvorLimiter(1, MINUTA);
    expect(smiProjit("1.1.1.1")).toBe(true);
    expect(smiProjit("1.1.1.1")).toBe(false);
    expect(smiProjit("2.2.2.2")).toBe(true); // jina IP neni ovlivnena
  });

  it("po minute stejnou IP zase pusti", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const smiProjit = vytvorLimiter(1, MINUTA);

    expect(smiProjit("1.2.3.4")).toBe(true);
    expect(smiProjit("1.2.3.4")).toBe(false);

    vi.setSystemTime(MINUTA); // "posun hodin" o minutu, test nemusi minutu cekat
    expect(smiProjit("1.2.3.4")).toBe(true);
  });

  it("pri plne pameti vyhodi nejstarsi IP (ochrana proti zahlceni pameti)", () => {
    const smiProjit = vytvorLimiter(1, MINUTA, 2); // pamet jen na 2 IP

    smiProjit("A"); // A vycerpa limit
    smiProjit("B");
    smiProjit("C"); // pamet plna -> A (nejstarsi) se vyhodi

    // A je zapomenuta -> zacina znovu od nuly, i kdyz limit vycerpala
    expect(smiProjit("A")).toBe(true);
  });
});
