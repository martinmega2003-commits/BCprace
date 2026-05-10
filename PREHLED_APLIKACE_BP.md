# Přehled aplikace pro bakalářskou práci

## Stručný popis aplikace
Aplikace slouží k načítání, ukládání a vyhodnocování běžeckých aktivit ze služby Strava. Uživatel se přihlásí přes Strava OAuth, následně proběhne synchronizace aktivit do lokální databáze SQLite a aplikace nad nimi vypočítává tréninkové ukazatele, například týdenní objem, intenzitu, TRIMP, AWRS a odhad VO2max. Součástí řešení je také AI vrstva, která vytváří slovní interpretaci celkové tréninkové zátěže a komentář ke konkrétnímu běhu.

Architektura je vícevrstvá:
- mobilní klient v React Native / Expo zajišťuje uživatelské rozhraní,
- webová vrstva v Next.js funguje hlavně jako backendové API,
- Python služba ve FastAPI provádí analytické výpočty,
- SQLite slouží jako sdílené datové úložiště.

Důležitý závěr: webová část zde neslouží primárně jako samostatné uživatelské rozhraní, ale především jako API gateway mezi mobilní aplikací, databází, Strava API a Python analytikou.

## Použité technologie
### Hlavní technologie
- `React Native` a `Expo`: mobilní klient.
- `Expo Router`: navigace mezi obrazovkami mobilní aplikace.
- `Next.js 16`: backendová API vrstva přes route handlery v `app/api`.
- `Node.js`: běh backendu.
- `better-sqlite3`: přímý přístup k SQLite databázi z Next.js.
- `FastAPI`: Python mikroservisa pro výpočty.
- `SQLite`: lokální relační databáze.
- `Docker` a `docker-compose`: spuštění všech částí aplikace jako samostatných služeb.
- `OpenAI` kompatibilní klient pro Azure OpenAI: AI textová interpretace tréninkových dat.

### Knihovny a nástroje pro frontend
- `react-native-gifted-charts`: sloupcový graf objemu tréninku.
- `react-native-chart-kit`: grafické zobrazení, v aktuálně načteném kódu není výrazně využito.
- `expo-haptics`: haptická odezva při ovládání.
- `expo-web-browser` a `expo-linking`: přihlášení přes OAuth a deep linking zpět do aplikace.

### Knihovny a nástroje pro backend a analytiku
- `fastapi`, `uvicorn`: HTTP API a běh Python služby.
- `pandas`, `matplotlib`: deklarované závislosti Python části; v aktuálně načteném `Main.py` nejsou zjevně využity, proto je jejich role nejistá.

## Struktura projektu
Níže je uvedena zjednodušená struktura pouze důležitých částí projektu.

```text
Rebulid01/
├─ data/
│  └─ strava.sqlite
├─ mobile/
│  └─ my-app/
│     ├─ app/
│     │  ├─ index.tsx
│     │  ├─ (tabs)/dashboard.tsx
│     │  ├─ (tabs)/RunDetail.tsx
│     │  └─ (tabs)/MujProfile.tsx
│     ├─ components/
│     │  ├─ RunItem.tsx
│     │  ├─ SimilarRunItem.tsx
│     │  ├─ WeeklyVolumeChartCard.tsx
│     │  ├─ WeeklyVolumeStrip.tsx
│     │  ├─ AwrsWidget.tsx
│     │  ├─ Vo2MaxWidget.tsx
│     │  └─ AiInsightCard.tsx
│     ├─ package.json
│     └─ Dockerfile
├─ web/
│  └─ muj-next-app/
│     ├─ app/api/
│     │  ├─ auth/route.tsx
│     │  ├─ callback/route.tsx
│     │  ├─ sync/route.tsx
│     │  ├─ me/route.tsx
│     │  ├─ activities/route.tsx
│     │  ├─ activity/route.tsx
│     │  ├─ weeklyvolume/route.tsx
│     │  ├─ vo2max/route.tsx
│     │  ├─ ai/route.tsx
│     │  ├─ aiTraining/route.tsx
│     │  └─ logout/route.tsx
│     ├─ lib/db.ts
│     ├─ package.json
│     └─ Dockerfile
├─ Python/
│  ├─ Main.py
│  ├─ requirements.txt
│  └─ Dockerfile
├─ docker-compose.yml
└─ ARCHITEKTURA.md
```

### Význam hlavních složek a souborů
#### `data/`
- Slouží jako perzistentní úložiště databáze `strava.sqlite`.
- Souvisí se všemi funkcemi aplikace, protože zde jsou uloženi uživatelé, session, tokeny i aktivity.
- Oblast: `databáze`, `backend`, `výpočty`.

#### `mobile/my-app/`
- Obsahuje mobilní klientskou aplikaci.
- Zajišťuje přihlášení uživatele, zobrazení dashboardu, detail běhu, profil a ovládání synchronizace.
- Oblast: `frontend`.

#### `mobile/my-app/app/index.tsx`
- Přihlašovací obrazovka.
- Otevírá OAuth tok přes backendový endpoint `/api/auth` a přijímá `session_id` přes deep link `myapp://auth/callback`.
- Oblast: `frontend`, `API`.

#### `mobile/my-app/app/(tabs)/dashboard.tsx`
- Hlavní obrazovka aplikace.
- Načítá profil, seznam aktivit, týdenní objem, AWRS, VO2max a AI insight; také spouští synchronizaci dat ze Stravy.
- Je to centrální vazební místo mezi frontendem a backendovými endpointy.
- Oblast: `frontend`, `API`, `grafy`, `analytika`.

#### `mobile/my-app/app/(tabs)/RunDetail.tsx`
- Detail jedné běžecké aktivity.
- Zobrazuje základní data běhu, vypočtené metriky, srovnání s podobnými běhy a AI komentář ke konkrétní aktivitě.
- Oblast: `frontend`, `API`, `výpočty`, `analytika`.

#### `mobile/my-app/app/(tabs)/MujProfile.tsx`
- Obrazovka uživatelského profilu.
- Umožňuje doplnit výšku, datum narození, váhu a klidovou tepovou frekvenci, tedy vstupy potřebné pro výpočty HRR, intenzity a VO2max.
- Oblast: `frontend`, `API`, `výpočty`.

#### `mobile/my-app/components/`
- Obsahuje znovupoužitelné prezentační komponenty.
- Jednotlivé komponenty napojují konkrétní výpočty na vizualizaci v UI.
- Oblast: `frontend`, `grafy`, `analytika`.

#### `mobile/my-app/components/WeeklyVolumeChartCard.tsx`
- Sloupcový graf dlouhodobého objemu tréninku.
- Převádí data z backendu do přehledu po 3 měsících, 6 měsících nebo za celé období.
- Oblast: `frontend`, `grafy`.

#### `mobile/my-app/components/WeeklyVolumeStrip.tsx`
- Kompaktní vizualizace aktuálního týdne po dnech.
- Doplňuje hlavní graf o rychlý přehled rozložení týdenního objemu.
- Oblast: `frontend`, `grafy`.

#### `mobile/my-app/components/AwrsWidget.tsx`
- Zobrazuje hodnotu AWRS a slovní interpretaci zátěže.
- Navazuje na výpočet provedený v Python vrstvě.
- Oblast: `frontend`, `analytika`.

#### `mobile/my-app/components/Vo2MaxWidget.tsx`
- Zobrazuje odhad VO2max a informaci o tom, z jak starých dat byl odhad vytvořen.
- Navazuje na analytický endpoint `/VO2MaxCalcul`.
- Oblast: `frontend`, `analytika`.

#### `mobile/my-app/components/AiInsightCard.tsx`
- Zobrazuje AI shrnutí tréninku včetně rizik a doporučených kroků.
- Napojeno na backendový endpoint `/api/ai`.
- Oblast: `frontend`, `analytika`.

#### `web/muj-next-app/`
- Backendová a integrační vrstva.
- Zajišťuje session management, Strava OAuth, synchronizaci aktivit, práci s databází a předávání požadavků do Python služby.
- Oblast: `backend`, `API`, `databáze`.

#### `web/muj-next-app/lib/db.ts`
- Inicializace SQLite připojení a definice databázových tabulek.
- Je klíčový pro perzistenci dat a propojení backendu s databází.
- Oblast: `backend`, `databáze`.
- Nejistota: ve `CREATE TABLE` definicích jsou formální nedostatky a aktuální databázový soubor neodpovídá zcela kódu, takže je vhodné chápat tento soubor jako zamýšlené schéma, ne nutně přesný obraz skutečné databáze.

#### `web/muj-next-app/app/api/auth/route.tsx`
- Vytváří OAuth `state` a přesměrovává uživatele na Strava přihlášení.
- Začátek autentizačního toku.
- Oblast: `backend`, `API`, `databáze`.

#### `web/muj-next-app/app/api/callback/route.tsx`
- Zpracovává návrat ze Stravy, získá tokeny, uloží uživatele a vytvoří `session_id`.
- Je klíčový pro bezpečné přihlášení a navázání uživatelské session.
- Oblast: `backend`, `API`, `databáze`.

#### `web/muj-next-app/app/api/sync/route.tsx`
- Stahuje aktivity z `Strava API`, ukládá je do SQLite a následně volá Python výpočty.
- Jde o hlavní integrační a orchestrace endpoint celé aplikace.
- Oblast: `backend`, `API`, `databáze`, `výpočty`.

#### `web/muj-next-app/app/api/me/route.tsx`
- `GET` vrací profilová data, `PATCH` profil aktualizuje.
- Dodává vstupy pro výpočty a zpřístupňuje je mobilnímu klientovi.
- Oblast: `backend`, `API`, `databáze`, `výpočty`.

#### `web/muj-next-app/app/api/activities/route.tsx`
- Vrací seznam běžeckých aktivit uživatele.
- Slouží pro naplnění seznamu aktivit na dashboardu.
- Oblast: `backend`, `API`, `databáze`.

#### `web/muj-next-app/app/api/activity/route.tsx`
- Vrací detail konkrétní aktivity a seznam podobných běhů.
- Vytváří datový podklad pro srovnání tempa v detailu běhu.
- Oblast: `backend`, `API`, `databáze`, `analytika`.

#### `web/muj-next-app/app/api/weeklyvolume/route.tsx`
- Přeposílá požadavek do Python služby pro výpočet týdenního objemu.
- Slouží jako API proxy mezi mobilem a analytickou vrstvou.
- Oblast: `backend`, `API`, `výpočty`, `grafy`.

#### `web/muj-next-app/app/api/vo2max/route.tsx`
- Přeposílá požadavek do Python služby pro odhad VO2max.
- Dodává analytická data na dashboard.
- Oblast: `backend`, `API`, `výpočty`, `analytika`.

#### `web/muj-next-app/app/api/ai/route.tsx`
- Zajišťuje AI souhrn tréninku za poslední období.
- Backend zde funguje jako brána k Python AI vrstvě.
- Oblast: `backend`, `API`, `analytika`.

#### `web/muj-next-app/app/api/aiTraining/route.tsx`
- Zajišťuje AI komentář ke konkrétnímu běhu.
- Rozšiřuje detail aktivity o slovní interpretaci dat.
- Oblast: `backend`, `API`, `analytika`.

#### `web/muj-next-app/app/api/logout/route.tsx`
- Odstraňuje session a tokeny uživatele.
- Souvisí se správou přihlášení a bezpečností práce s účtem.
- Oblast: `backend`, `API`, `databáze`.

#### `Python/Main.py`
- Hlavní analytická služba ve FastAPI.
- Obsahuje endpointy pro výpočty týdenního objemu, HR max, HRR, intenzity, TRIMP, AWRS, průměrného tempa, VO2max a AI interpretace.
- Oblast: `backend`, `API`, `výpočty`, `analytika`.

#### `Python/requirements.txt`
- Definuje Python závislosti potřebné pro běh analytické vrstvy.
- Oblast: `backend`, `výpočty`.

#### `docker-compose.yml`
- Spojuje tři služby: `mobile`, `web`, `python`.
- Zajišťuje jejich síťové propojení a sdílený přístup k databázi v `data/`.
- Oblast: `backend`, `API`, `databáze`, `infrastruktura`.

#### `ARCHITEKTURA.md`
- Textový doprovodný popis architektury projektu.
- Je to dokumentační soubor, nikoli spustitelná část aplikace.
- Oblast: `dokumentace`.

## Hlavní moduly aplikace
### 1. Autentizační modul
Zahrnuje soubory:
- `mobile/my-app/app/index.tsx`
- `web/muj-next-app/app/api/auth/route.tsx`
- `web/muj-next-app/app/api/callback/route.tsx`
- `web/muj-next-app/app/api/logout/route.tsx`
- `web/muj-next-app/lib/db.ts`

Funkce modulu:
- přihlášení přes Strava OAuth,
- kontrola `state` parametru,
- vytvoření lokální session,
- odhlášení a mazání tokenů.

### 2. Modul synchronizace dat
Zahrnuje soubory:
- `web/muj-next-app/app/api/sync/route.tsx`
- `web/muj-next-app/lib/db.ts`
- `Python/Main.py`

Funkce modulu:
- načtení aktivit z `Strava API`,
- uložení aktivit do SQLite,
- spuštění následných analytických výpočtů.

### 3. Profilový modul
Zahrnuje soubory:
- `mobile/my-app/app/(tabs)/MujProfile.tsx`
- `web/muj-next-app/app/api/me/route.tsx`
- `web/muj-next-app/lib/db.ts`

Funkce modulu:
- správa osobních údajů,
- ukládání parametrů potřebných pro výpočty,
- zpřístupnění dat ostatním částem systému.

### 4. Dashboardový modul
Zahrnuje soubory:
- `mobile/my-app/app/(tabs)/dashboard.tsx`
- `mobile/my-app/components/WeeklyVolumeChartCard.tsx`
- `mobile/my-app/components/WeeklyVolumeStrip.tsx`
- `mobile/my-app/components/AwrsWidget.tsx`
- `mobile/my-app/components/Vo2MaxWidget.tsx`
- `mobile/my-app/components/AiInsightCard.tsx`
- `web/muj-next-app/app/api/weeklyvolume/route.tsx`
- `web/muj-next-app/app/api/vo2max/route.tsx`
- `web/muj-next-app/app/api/ai/route.tsx`

Funkce modulu:
- přehled aktuální tréninkové situace,
- vizualizace objemu,
- zobrazení AWRS a VO2max,
- AI textové vyhodnocení.

### 5. Modul detailu aktivity
Zahrnuje soubory:
- `mobile/my-app/app/(tabs)/RunDetail.tsx`
- `mobile/my-app/components/SimilarRunItem.tsx`
- `web/muj-next-app/app/api/activity/route.tsx`
- `web/muj-next-app/app/api/aiTraining/route.tsx`
- `Python/Main.py`

Funkce modulu:
- zobrazení detailních údajů o běhu,
- srovnání s podobnými aktivitami,
- výklad metrik zátěže,
- AI komentář ke konkrétnímu tréninku.

### 6. Analytický modul
Zahrnuje soubory:
- `Python/Main.py`
- `web/muj-next-app/app/api/weeklyvolume/route.tsx`
- `web/muj-next-app/app/api/vo2max/route.tsx`
- `web/muj-next-app/app/api/ai/route.tsx`
- `web/muj-next-app/app/api/aiTraining/route.tsx`

Funkce modulu:
- výpočet odvozených tréninkových ukazatelů,
- agregace aktivit po týdnech,
- detekce zvýšené nebo nízké zátěže,
- interpretace dat pomocí AI.

## Datový model
Datový model je rozdělen mezi několik tabulek v SQLite databázi.

### Tabulka `users`
Účel:
- ukládá profil uživatele a část agregovaných výpočtů.

Zjištěné nebo zamýšlené sloupce:
- `id`
- `profile_medium`
- `strava_athlete_id`
- `username`
- `sex`
- `height_cm`
- `birth_date`
- `weight_kg`
- `rest_heartrate`
- `max_heartrate_calculated`
- `hrr`
- `awrs`
- pravděpodobně také `estimated_vo2max` a `estimated_vo2max_updated_at` podle kódu, ale v aktuální databázi tyto sloupce nejsou jednoznačně přítomné

Vztah k funkcím:
- bez této tabulky nelze počítat personalizované metriky založené na věku, klidové tepové frekvenci a dalších parametrech.

Oblast:
- `databáze`, `backend`, `výpočty`.

### Tabulka `sessions`
Účel:
- uchovává aktivní přihlášení uživatele.

Sloupce:
- `id`
- `user_id`
- `expires_at`
- `created_at`

Vztah k funkcím:
- je základem autentizace všech API volání z mobilní aplikace.

Oblast:
- `databáze`, `backend`, `API`.

### Tabulka `strava_tokens`
Účel:
- ukládá `access_token`, `refresh_token` a čas expirace tokenu.

Sloupce:
- `athlete_id`
- `access_token`
- `refresh_token`
- `expires_at`
- `user_id`
- `created_at`
- `updated_at`

Vztah k funkcím:
- umožňuje opakované načítání aktivit ze Stravy bez nového přihlášení.

Oblast:
- `databáze`, `backend`, `API`.

### Tabulka `activities`
Účel:
- ukládá jednotlivé aktivity importované ze Stravy a jejich dopočtené metriky.

Zjištěné nebo zamýšlené sloupce:
- `id`
- `user_id`
- `name`
- `distance`
- `moving_time`
- `elapsed_time`
- `type`
- `start_date`
- `average_cadence`
- `average_speed`
- `max_speed`
- `average_heartrate`
- `max_heartrate`
- `intensity`
- `trimp`
- `Avg_speed` jako tempo v minutách na kilometr
- podle kódu pravděpodobně i `Elevation` a `estimated_vo2`, ale v aktuální databázi nejsou spolehlivě potvrzeny

Vztah k funkcím:
- tvoří hlavní zdroj pro seznam aktivit, detail běhu, grafy i analytické výpočty.

Oblast:
- `databáze`, `backend`, `výpočty`, `grafy`.

### Tabulka `oauth_states`
Účel:
- ochrana OAuth toku proti podvrženému požadavku.

Nejistota:
- v kódu je tabulka vytvářena a používána, ale v aktuální databázi nebyla jednoznačně potvrzena její struktura.

Oblast:
- `databáze`, `backend`, `API`.

### Datový tok
1. Uživatel se přihlásí přes Stravu.
2. Backend vytvoří `session_id` a uloží tokeny.
3. Synchronizační endpoint stáhne seznam aktivit ze Stravy.
4. Aktivity se uloží do tabulky `activities`.
5. Python služba nad nimi vypočítá odvozené metriky a ukládá je zpět do databáze nebo vrací v odpovědi.
6. Mobilní klient si tato data načítá přes Next.js API.

## Hlavní funkce
- přihlášení uživatele přes `Strava OAuth`,
- vytvoření a správa lokální session,
- synchronizace sportovních aktivit ze Stravy,
- ukládání aktivit do lokální SQLite databáze,
- zobrazení seznamu běhů,
- zobrazení detailu konkrétní aktivity,
- evidence a úprava uživatelských parametrů,
- výpočet týdenního objemu tréninku,
- výpočet odhadu maximální tepové frekvence,
- výpočet `HRR`,
- výpočet relativní intenzity běhu,
- výpočet `TRIMP`,
- výpočet `AWRS`,
- odhad `VO2max`,
- srovnání aktuálního běhu s podobnými běhy,
- AI textová interpretace celkového tréninku,
- AI textová interpretace konkrétního běhu.

## Vizualizace dat
Aplikace obsahuje několik forem zobrazení tréninkových dat.

### Týdenní a dlouhodobý objem
- `WeeklyVolumeChartCard.tsx` zobrazuje sloupcový graf objemu po týdnech nebo agregovaně po delších obdobích.
- `WeeklyVolumeStrip.tsx` zobrazuje rozložení kilometrů v aktuálním týdnu po dnech.
- Tato data pocházejí z Python endpointu `/weeklyvolume`.

### Přehledové analytické widgety
- `AwrsWidget.tsx` zobrazuje číselnou hodnotu AWRS a slovní kategorii zatížení.
- `Vo2MaxWidget.tsx` zobrazuje hodnotu odhadu VO2max a informaci, zda jde o aktuální nebo starší odhad.

### Seznam a detail aktivit
- `RunItem.tsx` zobrazuje jednotlivé běhy v seznamu na dashboardu.
- `RunDetail.tsx` zobrazuje detailní metriky: vzdálenost, čas, tempo, kadenci, rychlost, tep, intenzitu, TRIMP a odhadované VO2 konkrétní aktivity.
- `SimilarRunItem.tsx` zobrazuje podobné běhy a jejich tempo pro srovnání.

### Textová interpretace pomocí AI
- `AiInsightCard.tsx` zobrazuje rizika, shrnutí a doporučené další kroky pro celkový trénink.
- V detailu běhu se zobrazuje samostatný AI komentář k jedné aktivitě.

## Analytické funkce
Analytické funkce jsou implementovány převážně v `Python/Main.py`.

### Výpočet týdenního objemu
Endpoint `/weeklyvolume`:
- filtruje běžecké aktivity,
- sčítá kilometráž po týdnech,
- připravuje hodnotu celkového objemu a rozpis aktuálního týdne po dnech.

### Výpočet HR max
Endpoint `/CalHRmax`:
- kombinuje odhad maximální tepové frekvence podle věku s reálně pozorovaným maximem z aktivit.

### Výpočet HRR
Endpoint `/HRR`:
- počítá rozdíl mezi maximální a klidovou tepovou frekvencí.

### Výpočet intenzity
Endpoint `/IntesityCalcul`:
- používá `average_heartrate`, `rest_heartrate` a `hrr`,
- ukládá relativní intenzitu do aktivit,
- dopočítává i odhadované VO2 pro konkrétní běh.

### Výpočet TRIMP
Endpoint `/Trimp`:
- odhaduje celkovou tréninkovou zátěž každé aktivity na základě délky a tepové odezvy.

### Výpočet AWRS
Endpoint `/awrs`:
- porovnává akutní a chronickou zátěž,
- ukládá výsledek do tabulky `users`.

### Výpočet průměrného tempa
Endpoint `/avg`:
- převádí čas a vzdálenost na tempo v minutách na kilometr.

### Odhad VO2max
Endpoint `/VO2MaxCalcul`:
- vybírá vhodné běhy podle délky, délky trvání, intenzity a převýšení,
- odhaduje VO2max z rychlosti a relativní intenzity,
- ukládá nejlepší nalezený odhad.

### AI analýza tréninku
Endpoint `/ai`:
- pracuje s aktivitami přibližně za posledních 28 dní,
- doplňuje kontext pomocí AWRS, délky pauzy a návratu po přerušení,
- vrací strukturované textové doporučení.

### AI analýza konkrétní aktivity
Endpoint `/aiTraining`:
- porovnává zvolený běh s podobnými běhy,
- pracuje s tempem, TRIMP, intenzitou, AWRS a případnou delší pauzou,
- vrací komentář k náročnosti a doporučení pro další 1 až 2 dny.

## Testování
V dostupné struktuře projektu nebyly nalezeny samostatné testovací soubory ani zjevná automatizovaná testovací sada.

Zjištění:
- v `package.json` mobilní i webové části je přítomen `lint`,
- nebyly nalezeny soubory typu `*.test.*`, `*.spec.*` ani testovací adresáře vlastní aplikace,
- projekt tedy pravděpodobně spoléhá hlavně na ruční testování, lint a průběžné ověřování během vývoje.

Dopad:
- funkčnost kritických částí, například synchronizace, práce s databází a výpočetních endpointů, nemusí být automaticky ověřována po změnách.

## Limity aplikace
### 1. Silná vazba na Strava ekosystém
Aplikace je navázána na Strava OAuth a Strava API. Bez těchto služeb není hlavní funkcionalita použitelná.

### 2. Lokální SQLite jako centrální úložiště
SQLite je jednoduchá a vhodná pro prototyp nebo menší nasazení, ale má omezení při vyšší souběžnosti a škálování.

### 3. Závislost analytiky na úplnosti profilu
Pro část výpočtů jsou nezbytné údaje jako datum narození nebo klidová tepová frekvence. Pokud chybí, některé metriky nelze spočítat nebo budou neúplné.

### 4. Omezené pokrytí aktivit
Většina výpočtů je zaměřena na aktivity typu `Run`. Ostatní sportovní aktivity jsou z pohledu analytiky zpracovány omezeně nebo vůbec.

### 5. Možný nesoulad mezi kódem a databázovým schématem
V kódu jsou používány sloupce jako `estimated_vo2`, `Elevation`, `estimated_vo2max` nebo tabulka `oauth_states`, ale v aktuální databázi nebyly všechny jednoznačně potvrzeny. To ukazuje na možné riziko driftu mezi implementací a skutečným stavem databáze.

### 6. Chybějící automatické testy
Projekt aktuálně neobsahuje zjevnou testovací vrstvu, což zvyšuje riziko regresí.

### 7. AI výstupy nejsou deterministická analytika v užším slova smyslu
AI komentáře jsou uživatelsky přínosné, ale nejsou ekvivalentem formálně validované sportovní diagnostiky. V práci je vhodné je popsat jako interpretační nadstavbu nad vypočtenými metrikami.

### 8. Webová část není plnohodnotné uživatelské rozhraní
Webový projekt v Next.js slouží převážně jako API backend. Pokud by měla aplikace fungovat i jako klasická webová aplikace pro koncového uživatele, tato vrstva je zatím nedostatečná.

### 9. Některé části jsou nejisté
- role `pandas` a `matplotlib` v aktuální verzi aplikace není z kódu `Main.py` patrná,
- skutečné databázové schéma se liší od zamýšleného schématu v `lib/db.ts`,
- soubory `hello` endpointu a některé pomocné konfigurace nepůsobí jako podstatná část finální aplikace.

## Shrnutí architektury
Aplikace je navržena jako mobilní systém pro analýzu běžeckého tréninku. Mobilní část zajišťuje interakci s uživatelem, Next.js vrstva zajišťuje autentizaci, session a přístup k datům a Python vrstva soustřeďuje výpočty a AI interpretaci. Data jsou centralizovaně ukládána do SQLite databáze sdílené mezi backendem a analytickou službou. Toto řešení je přehledné a praktické pro studentský projekt, ale při dalším rozvoji by bylo vhodné posílit konzistenci databázového schématu, doplnit testy a zvážit robustnější perzistenci.y
