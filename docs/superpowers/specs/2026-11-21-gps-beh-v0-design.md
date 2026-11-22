# GPS záznam běhu v0 – návrh

Datum: 2026-11-21 · Autor: Martin Mega (s pomocí Claude)

## Kontext

Přihlášení je hotové (vlastní registrace a login, session v DB, token v hlavičce). Appka ale nemá
odkud brát data: Strava je odstraněná a import z Apple Health potřebuje vývojový build s HealthKitem.
Nový uživatel tak vidí prázdný dashboard a analytika (TRIMP, ACWR, VO2max) nemá z čeho počítat.

Cíl v0: uživatel zmáčkne **Start**, běží, zmáčkne **Stop**, uvidí souhrn s mapou a běh se uloží
do jeho dat. Všechno musí jít vyzkoušet v **Expo Go** (bez Macu a bez nového buildu).

Návrh se může během implementace upravit; změny se zapíšou sem.

## Verze

| verze | obsah |
|---|---|
| **v0 (tento dokument)** | záznam při rozsvíceném displeji, výpočty s filtrem, obrazovky Běh a Souhrn, mapa v detailu běhu, backend |
| v1 | záznam na pozadí / zamčený displej (potřebuje build), živá mapa jako přepínač „Mapa / Čísla“ |
| v2 | ochrana proti pádu appky (body průběžně do SQLite), tep z Apple Health / Health Connect za časové okno běhu (s pozdějším doplněním), import z Health přeskočí tréninky překrývající se s během z appky |
| později | převýšení, hlasové hlášení po km, map matching (přichycení trasy k cestám, OSRM/Valhalla na vlastním serveru, surová data zůstávají uložená zvlášť), skrytí začátku a konce trasy kvůli soukromí |

## Rozhodnutí

### Přístup
Nejdřív do telefonu, po běhu na server. Během běhu se nic neposílá (funguje bez signálu, šetří baterii).

### Záznam polohy (`mobile/my-app/lib/beh/zaznam.ts`)
- Knihovna `expo-location` (je v Expo Go), oprávnění jen „při používání appky“.
- `watchPositionAsync`, nejvyšší přesnost, nový bod přibližně každou sekundu.
- `expo-keep-awake`: displej během běhu nezhasne (ve v0 by zhasnutí zastavilo záznam).
- Body se drží v paměti. Pád appky = ztráta běhu (vědomý kompromis v0, řeší v2).
- Ovládání: Start → Pauza / Pokračovat → Stop. Pauza zvýší číslo úseku (`segment`).
- Čas pohybu se měří stopkami (celkový čas minus pauzy), ne z GPS.
- Testování na Windows: Android emulátor, Extended controls → Location → přehrání trasy / GPX.

### Výpočty (`mobile/my-app/lib/beh/vypocty.ts`) – čisté funkce s testy
Bod: `cas` (ms), `lat`, `lon`, `presnost` (m), `segment`.

1. **Filtr** – bod se zahodí, když má přesnost horší než 20 m, když by z něj vyšla rychlost
   nad 10 m/s od posledního dobrého bodu, nebo když jeho čas není novější než předchozí.
2. **Vzdálenost** – Haversinův vzorec, sčítá se jen mezi body ve stejném úseku.
3. **Aktuální tempo** – z posledních ~30 s; pod ~20 m uražených za tu dobu se zobrazí „--:--“.
4. **Průměrné tempo** – čas pohybu ÷ celková vzdálenost.
5. **Mezičasy po km** – čas překročení každého celého km, dopočítaný poměrem mezi dvěma body.

Převýšení ve v0 není (výška z GPS je příliš nepřesná).

Testy: Vitest v mobilní appce. Scénáře mimo jiné: dva body se známou vzdáleností, skok GPS
(musí se zahodit), bod s horší přesností, pauza uprostřed (vzdálenost přes ni se nepočítá),
mezičasy u běhu přes 2 km, stání na místě (tempo „--:--“).

### Obrazovky
- **Dashboard**: tlačítko „Začít běh“.
- **Běh** (`app/beh.tsx`): stav GPS („Hledám GPS…“, Start zašedlý do prvního bodu s přesností
  do 20 m), čas pohybu, vzdálenost, aktuální a průměrné tempo, tlačítka Pauza/Pokračovat a Stop.
  Stop i odchod z obrazovky se ptají na potvrzení. Při odmítnutém oprávnění vysvětlení
  a tlačítko do Nastavení. Bez mapy.
- **Souhrn** (`app/beh-souhrn.tsx`): mapa s trasou (`react-native-maps`, v Expo Go), vzdálenost,
  čas, průměrné tempo, mezičasy, tlačítka Zahodit (s potvrzením) a Uložit → dashboard.
- **Detail běhu** (`RunDetail`): stejná mapa s trasou načtenou ze serveru.
- Mapa je jedna sdílená komponenta. Data mezi Během a Souhrnem se předají přes sdílené
  úložiště v paměti, ne přes parametry adresy.

### Backend
**Tabulka `activity_points`**: `activity_id` (odkaz na `activities`, mazání kaskádou), `seq`
(pořadí; klíč spolu s `activity_id`), `recorded_at`, `lat`, `lon`, `accuracy_m`, `segment`.
Ukládají se body, které prošly filtrem. Souhrn běhu jde do `activities` se `source = 'app'`.

**`POST /api/runs`** – uložení běhu:
1. `getCurrentUser()`, jinak 401.
2. Validace přes Zod (rozsahy hodnot, souřadnice, nejvýš ~20 000 bodů), jinak 400.
3. Transakce: běh i všechny body, nebo nic.
4. `external_id` generuje telefon (náhodné UUID); `ON CONFLICT` zajistí, že opakované odeslání
   nevytvoří druhý běh.
5. `prepocitatMetriky(user.id)`.

**`GET /api/runs/points?activity_id=…`** – body pro mapu: `getCurrentUser()` + kontrola vlastníka
(cizí nebo neexistující běh → 404). Trasa prozrazuje polohu bydliště.

## Bezpečnost a soukromí
- Body trasy jsou citlivá data: jen přes přihlášeného vlastníka, nikdy v logu.
- Limit počtu bodů a validace vstupu chrání server před obřím nebo nesmyslným požadavkem.
- Skrytí začátku a konce trasy (privacy zones) – později; datový model to nebrání.

## Mimo rozsah v0
Záznam na pozadí, živá mapa, SQLite, tep, převýšení, hlasové hlášení, map matching, privacy zones,
pravidlo proti duplicitám s importem z Health.
