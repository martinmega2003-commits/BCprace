// Rate limit: kolik pozadavku smi jeden klic (napr. IP adresa) poslat za casove okno.
// Pamet je jen v tomto procesu -> funguje, dokud bezi 1 kopie aplikace (maxReplicas: 1).

export function vytvorLimiter(limit: number, oknoMs: number) {
  // "tovarna": pamet vznikne jednou a hlidac ji sdili mezi vsemi volanimi
  const pamet = new Map<string, { pocet: number; zacatek: number }>();

  // "hlidac": rozhoduje pri kazdem pozadavku
  return (klic: string): boolean => {
    const ted = Date.now();
    const zaznam = pamet.get(klic);

    // nova IP nebo uz uplynulo cele okno -> pocitame znovu od 1
    if (!zaznam || ted - zaznam.zacatek >= oknoMs) {
      pamet.set(klic, { pocet: 1, zacatek: ted });
      return true;
    }

    zaznam.pocet += 1;
    return zaznam.pocet <= limit;
  };
}
