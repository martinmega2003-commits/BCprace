// Rate limit (sliding window): kolik pozadavku smi jeden klic (napr. IP) poslat za poslednich oknoMs.
// Pamet je jen v tomto procesu -> funguje, dokud bezi 1 kopie aplikace (maxReplicas: 1).

// rozhodne o jedne IP: casy = jeji povolene pozadavky, serazene od nejstarsiho
export function smiProjit(casy: number[], ted: number, limit: number, oknoMs: number): boolean {
  while (casy.length > 0 && ted - casy[0] >= oknoMs) {
    casy.shift();
  }
  if (casy.length >= limit) {
    return false;
  }
  casy.push(ted);
  return true;
}

// smaze IP, ktere uz v okne nemaji zadny pozadavek
export function uklid(pamet: Map<string, number[]>, ted: number, oknoMs: number) {
  for (const [klic, casy] of pamet) {
    const posledni = casy.at(-1);
    if (posledni === undefined || ted - posledni >= oknoMs) {
      pamet.delete(klic);
    }
  }
}

export function vytvorLimiter(limit: number, oknoMs: number, maxZaznamu = 10_000) {
  const pamet = new Map<string, number[]>();
  let posledniUklid = Date.now();

  return (klic: string): boolean => {
    const ted = Date.now();

    // uklid nejvys jednou za okno
    if (ted - posledniUklid >= oknoMs) {
      uklid(pamet, ted, oknoMs);
      posledniUklid = ted;
    }

    let casy = pamet.get(klic);
    if (!casy) {
      // nova IP a pamet je plna -> vyhod nejstarsi (jeden krok, zadne prochazeni cele pameti)
      if (pamet.size >= maxZaznamu) {
        const nejstarsi = pamet.keys().next().value;
        if (nejstarsi !== undefined) pamet.delete(nejstarsi);
      }
      casy = [];
      pamet.set(klic, casy);
    }

    const vysledek = smiProjit(casy, ted, limit, oknoMs);
    return vysledek;
  };
}