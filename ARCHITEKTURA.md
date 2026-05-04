# Architektura aplikace

## Prehled

Aplikace je navrzena jako vicevrstva platforma pro praci s bezeckymi daty ze Stravy. Sklada se z mobilniho klienta v React Native, backendove API vrstvy v Node.js/Next.js, Python mikroservisy pro datovou analyzu a sdilene SQLite databaze.

Zakladni komunikacni tok je:

```text
React Native klient
  -> Next.js API
  -> SQLite databaze
  -> FastAPI Python mikroservisa
  -> SQLite databaze / Azure OpenAI
```

Mobilni aplikace nekomunikuje primo s databazi ani primo s Python sluzbou. Veskere pozadavky z klienta prochazeji pres backend API, ktere resi autentizaci, session, synchronizaci dat a predavani analytickych pozadavku do Python vrstvy.

## Client Layer

Client Layer predstavuje mobilni aplikace vytvorena v React Native pomoci Expo. Tato vrstva obsahuje uzivatelske rozhrani, navigaci a interakce s uzivatelem.

Do teto vrstvy patri hlavne:

- prihlasovaci obrazovka
- dashboard s prehledem treninku
- detail konkretni aktivity
- profil uzivatele
- UI komponenty pro grafy, seznamy aktivit, AWRS a AI insight

Klient pouziva hodnotu `EXPO_PUBLIC_API_BASE_URL`, pres kterou vola backendove endpointy. Typicke pozadavky smeruji na:

- `/api/auth`
- `/api/sync`
- `/api/weeklyvolume`
- `/api/me`
- `/api/activities`
- `/api/activity`
- `/api/ai`

Pri prihlaseni klient otevira Strava OAuth tok pres backendovy endpoint `/api/auth`. Po uspesnem prihlaseni backend vrati `session_id`, ktere mobilni aplikace pouziva pri dalsich pozadavcich. Klient tedy uchovava pouze identifikator session a zobrazuje data, ktera ziska z API vrstvy.

## API Layer

API Layer je implementovana v Node.js pomoci Next.js route handleru v adresari `web/muj-next-app/app/api`. Tato vrstva funguje jako hlavni vstupni bod pro mobilni aplikaci.

Jeji odpovednosti jsou:

- prijem HTTP pozadavku z mobilni aplikace
- validace `session_id`
- prace s uzivatelskou session
- Strava OAuth autentizace
- ziskavani dat ze Strava API
- cteni a zapis do SQLite databaze
- volani Python FastAPI mikroservisy
- vraceni JSON odpovedi klientovi

Backend API pouziva knihovnu `better-sqlite3` pro praci se SQLite databazi. Pri startu definuje tabulky jako `users`, `sessions`, `activities`, `strava_tokens` a `oauth_states`.

API Layer zaroven funguje jako gateway mezi mobilnim klientem a Python sluzbou. Klient tedy nemusi znat adresu FastAPI mikroservisy ani strukturu analytickych endpointu.

## Service Layer

Service Layer obsahuje aplikační logiku, ktera propojuje jednotlive casti systemu. V teto aplikaci je rozdelena mezi Next.js backend a Python mikroservisu.

V Next.js casti Service Layer zpracovava:

- OAuth prihlaseni pres Stravu
- vytvoreni a ulozeni session
- ulozeni access tokenu a refresh tokenu
- synchronizaci aktivit ze Strava API
- ulozeni aktivit do databaze
- spousteni navazujicich vypoctu v Python sluzbe
- obsluhu profilu uzivatele
- pripravu dat pro dashboard a detail aktivity

Typicky priklad service toku je synchronizace aktivit. Mobilni klient zavola `/api/sync`, backend podle `session_id` najde uzivatele, ziska Strava access token, stahne aktivity ze Stravy, ulozi je do tabulky `activities` a pote zavola Python endpointy pro dopocteni metrik jako HR max, HRR, intenzita, TRIMP a AWRS.

## Data Processing Layer

Data Processing Layer je implementovana v Pythonu pomoci FastAPI. Tato vrstva je urcena pro analyticke vypocty a praci s treninkovymi metrikami.

Python sluzba poskytuje tyto hlavni endpointy:

- `/weeklyvolume` pro vypocet tydenniho objemu behu
- `/CalHRmax` pro vypocet maximalni tepove frekvence
- `/HRR` pro vypocet heart rate reserve
- `/IntesityCalcul` pro vypocet intenzity aktivit
- `/Trimp` pro vypocet treninkove zateze TRIMP
- `/awrs` pro vypocet acute workload ratio score
- `/avg` pro vypocet prumerneho tempa
- `/ai` pro AI vyhodnoceni poslednich aktivit
- `/aiTraining` pro AI vyhodnoceni jedne konkretni aktivity

Python mikroservisa pracuje se stejnou SQLite databazi jako Next.js backend. Cestu k databazi ziskava z promenne prostredi `SQLITE_DB_PATH`. To umoznuje, aby backend API data do databaze ulozil a Python vrstva nad nimi nasledne provedla vypocty.

Cast `/ai` a `/aiTraining` navic pouziva Azure OpenAI/OpenAI kompatibilni API. Python sluzba nejprve pripravi vstupni data z databaze, sestavi strukturovany prompt a nasledne vrati backendu JSON odpoved s treninkovym doporucenim nebo analyzou.

## Data Layer

Data Layer tvori SQLite databaze. V aplikaci slouzi jako sdilene uloziste mezi Node.js backendem a Python analytickou sluzbou.

Hlavni tabulky jsou:

- `users` pro profil uzivatele a vypoctene metriky
- `sessions` pro prihlasene uzivatele
- `activities` pro aktivity stazene ze Stravy
- `strava_tokens` pro access tokeny a refresh tokeny
- `oauth_states` pro ochranu OAuth prihlaseni

Tabulka `activities` obsahuje jak puvodni data ze Stravy, tak vypoctene hodnoty, napr. `intensity`, `trimp` a `Avg_speed`. Tabulka `users` obsahuje profilove udaje a agregovane metriky jako `max_heartrate_calculated`, `hrr` a `awrs`.

## Komunikace mezi vrstvami

### Prihlaseni

1. Uzivatel v mobilni aplikaci klikne na prihlaseni pres Stravu.
2. React Native klient otevre backendovy endpoint `/api/auth`.
3. Backend vytvori OAuth `state` a presmeruje uzivatele na Stravu.
4. Strava po prihlaseni zavola `/api/callback`.
5. Backend vymeni autorizacni kod za tokeny.
6. Backend vytvori nebo aktualizuje uzivatele v databazi.
7. Backend vytvori `session_id` a pres deep link ho vrati mobilni aplikaci.

### Synchronizace aktivit

1. Mobilni klient zavola `/api/sync?session_id=...`.
2. Backend podle session najde uzivatele.
3. Backend nacte Strava access token.
4. Backend stahne aktivity ze Strava API.
5. Backend ulozi aktivity do SQLite databaze.
6. Backend postupne zavola Python endpointy pro vypocty.
7. Python sluzba aktualizuje vypoctene hodnoty v databazi.
8. Backend vrati klientovi informaci o dokonceni synchronizace.

### Zobrazeni dashboardu

1. Mobilni klient vola `/api/weeklyvolume`, `/api/me`, `/api/activities` a volitelne `/api/ai`.
2. Backend overi session.
3. Backend bud nacte data primo ze SQLite, nebo zavola Python FastAPI.
4. Python sluzba vypocita analyticka data, napr. tydenni objem nebo AI insight.
5. Backend vrati JSON odpoved mobilni aplikaci.
6. React Native komponenty zobrazí grafy, seznam aktivit, AWRS a AI doporuceni.

## Nasazeni a infrastruktura

Aplikace je pripravena pro spusteni pomoci Docker Compose. Definovane jsou tri hlavni sluzby:

- `mobile` pro Expo/React Native aplikaci
- `web` pro Next.js backend API
- `python` pro FastAPI analytickou mikroservisu

Vsechny sluzby jsou pripojene do spolecne Docker site `rebulid01-network`. Backend komunikuje s Python sluzbou pres interní adresu `http://python:8000`, ktera je nastavena v promenne `PYTHON_API_URL`.

Sdilena databaze je pripojena jako Docker volume `./data:/data`. Diky tomu maji Next.js i Python pristup ke stejnemu souboru `strava.sqlite`.

## Shrnutí

Architektura aplikace odpovida vicevrstvemu modelu:

- `Client Layer` zajistuje mobilni uzivatelske rozhrani v React Native.
- `API Layer` poskytuje backendove HTTP endpointy v Next.js.
- `Service Layer` realizuje autentizaci, synchronizaci, session management a orchestraci vypoctu.
- `Data Processing Layer` provadi analyticke a AI vypocty ve FastAPI.
- `Data Layer` uklada uzivatele, session, tokeny, aktivity a vypoctene metriky ve SQLite databazi.

Hlavni vyhodou tohoto rozdeleni je oddeleni uzivatelskeho rozhrani od aplikační logiky a narocnejsich datovych vypoctu. Mobilni aplikace zustava jednoducha a komunikuje pouze s jednim backendem, zatimco specializovane vypocty jsou izolovane v Python mikroservise.
