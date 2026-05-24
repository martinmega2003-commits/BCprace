# Mobilni aplikace pro analyzu bezeckeho treninku

Tento projekt je praktickou casti bakalarske prace. Vysledkem je mobilni aplikace, ktera nacita bezecke aktivity ze Stravy, uklada je do lokalni databaze a zobrazuje uzivateli treninkove metriky, prehledy a AI interpretace.

Webova cast v tomto repozitari neslouzi jako samostatny webovy produkt. Funguje jako API vrstva pro mobilni aplikaci. Python cast zpracovava vypocty treninkovych metrik a AI vyhodnoceni.

## Repozitar

GitHub: [martinmega2003-commits/BCprace](https://github.com/martinmega2003-commits/BCprace)

## Hlavni funkce

- prihlaseni uzivatele pres Strava OAuth
- synchronizace aktivit ze Strava API
- dashboard s prehledem treninku
- detail konkretniho behu
- profil uzivatele a doplneni osobnich udaju
- vypocet tydniho objemu
- vypocet maximalni tepove frekvence, HRR, intenzity, TRIMP a ACWR
- orientacni odhad VO2max
- AI interpretace celkove treninkove zateze
- AI interpretace konkretniho behu

## Architektura

Projekt je rozdeleny do tri hlavnich casti:

- `mobile/my-app` - mobilni aplikace v Expo / React Native
- `web/muj-next-app` - Next.js API vrstva pro prihlaseni, synchronizaci a komunikaci s mobilni aplikaci
- `Python` - FastAPI sluzba pro vypocet metrik a AI vyhodnoceni
- `data` - SQLite databaze sdilena mezi backendovymi sluzbami

Zakladni tok aplikace:

1. Uzivatel se v mobilni aplikaci prihlasi pres Stravu.
2. Next.js API zpracuje OAuth callback a ulozi tokeny.
3. Mobilni aplikace zavola synchronizaci aktivit.
4. Next.js API nacte aktivity ze Stravy a ulozi je do SQLite.
5. Python sluzba spocita treninkove metriky.
6. Mobilni aplikace zobrazi dashboard, detail behu a AI interpretace.

## Technologie

- Expo
- React Native
- TypeScript
- Next.js
- FastAPI
- Python
- SQLite
- Docker Compose
- Strava API
- Azure OpenAI / OpenAI kompatibilni API

## Struktura projektu

```text
.
├── docker-compose.yml
├── data/
│   └── strava.sqlite
├── mobile/
│   └── my-app/
│       ├── app/
│       ├── components/
│       └── package.json
├── web/
│   └── muj-next-app/
│       ├── app/api/
│       ├── lib/db.ts
│       └── package.json
└── Python/
    ├── Main.py
    ├── Dockerfile
    └── requirements.txt
```

## Pozadavky

Pro spusteni projektu je potreba:

- Node.js
- npm
- Python
- Docker Desktop
- Expo Go nebo Android/iOS emulator
- Strava API aplikace
- Azure OpenAI nebo OpenAI kompatibilni endpoint pro AI cast

## Konfigurace prostredi

Projekt pouziva lokalni `.env` soubory. Tyto soubory nesmi obsahovat verejne sdilene tajne klice.

### Web API

Soubor: `web/muj-next-app/.env.local`

```env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
APP_BASE_URL=http://<LAN_IP_ADRESA>:3000
PYTHON_API_URL=http://127.0.0.1:8000
SQLITE_DB_PATH=../../data/strava.sqlite
```

`APP_BASE_URL` musi byt adresa, na kterou se dostane mobilni telefon nebo emulator. Pri testovani na fyzickem telefonu je obvykle potreba LAN IP adresa pocitace.

### Mobilni aplikace

Soubor: `mobile/my-app/.env.local`

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP_ADRESA>:3000
```

### Python sluzba

Soubor: `Python/.env`

```env
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_SYSTEM_PROMPT1=
AZURE_OPENAI_SYSTEM_PROMPT2=
SQLITE_DB_PATH=../data/strava.sqlite
```

## Spusteni pres Docker Compose

Z rootu projektu:

```bash
docker compose up --build
```

Sluzby:

- Next.js API: `http://localhost:3000`
- Python API: `http://localhost:8000`
- Expo Metro bundler: `http://localhost:8081`

Pri spousteni mobilni aplikace na fyzickem zarizeni je potreba, aby telefon i pocitac byly ve stejne siti.

## Manualni spusteni

### Python API

```bash
cd Python
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn Main:app --host 0.0.0.0 --port 8000 --reload
```

### Next.js API

```bash
cd web/muj-next-app
npm install
npm run dev
```

### Mobilni aplikace

```bash
cd mobile/my-app
npm install
npx expo start
```

Po spusteni Expo lze aplikaci otevrit v Expo Go, Android emulatoru nebo iOS simulatoru.

## Hlavni API endpointy

Next.js API:

- `GET /api/auth` - zahajeni Strava OAuth prihlaseni
- `GET /api/callback` - OAuth callback ze Stravy
- `GET /api/sync` - synchronizace aktivit
- `GET /api/me` - profil uzivatele
- `PATCH /api/me` - ulozeni profilu uzivatele
- `GET /api/activities` - seznam aktivit
- `GET /api/activity` - detail aktivity
- `GET /api/weeklyvolume` - tydenni objem
- `GET /api/vo2max` - odhad VO2max
- `GET /api/ai` - AI vyhodnoceni dashboardu
- `GET /api/aiTraining` - AI vyhodnoceni konkretni aktivity
- `GET /api/logout` - odhlaseni

Python API:

- `GET /weeklyvolume`
- `GET /CalHRmax`
- `GET /HRR`
- `GET /IntesityCalcul`
- `GET /Trimp`
- `GET /ACWR`
- `GET /avg`
- `GET /VO2MaxCalcul`
- `GET /ai`
- `GET /aiTraining`

## Databaze

Aplikace pouziva SQLite databazi. Databazovy soubor je ulozeny v adresari `data`.

Pri spusteni pres Docker Compose se aktualni databaze `data/strava.sqlite` mapuje do backendovych kontejneru jako `/data/strava.sqlite`. Stejnou databazi tedy pouziva Next.js API i Python sluzba.

```yaml
volumes:
  - ./data:/data
```

Zmeny provedene aplikaci v Dockeru zustavaji ulozene v lokalnim souboru `data/strava.sqlite`. Databaze se zamerne nevklada primo do Docker image, protoze muze obsahovat uzivatelska data, session a Strava tokeny.

Hlavni tabulky:

- `users` - uzivatelsky profil a vypoctene metriky
- `strava_tokens` - tokeny pro pristup ke Strava API
- `sessions` - prihlasene session mobilni aplikace
- `activities` - synchronizovane sportovni aktivity
- `oauth_states` - ochrana OAuth flow proti zneuziti

## Treninkove metriky

Aplikace pracuje s temito metrikami:

- tydenni objem behu
- maximalni tepova frekvence odhadnuta z veku a namerenych aktivit
- HRR, tedy rezerva tepove frekvence
- relativni intenzita aktivity
- TRIMP jako odhad treninkove zateze
- ACWR jako pomer akutni a chronicke zateze
- orientacni odhad VO2max

Vypocty jsou zalozene na datech dostupnych ze Stravy. Pokud aktivite chybi tep, vzdalenost nebo cas, nektere metriky nemusi byt dostupne.

## AI interpretace

AI cast vytvari textove shrnuti treninkove zateze a konkretniho behu. AI vystup je podpurna interpretace dat, ne lekarske doporuceni ani zavazny treninkovy plan.

Backend predava AI modelu pouze vypoctene metriky a relevantni aktivity. Prompt omezuje model tak, aby nevymyslel chybejici udaje a pracoval pouze s poskytnutymi daty.

## Overeni projektu

Zakladni kontroly:

```bash
python -m unittest discover -s Python/tests
```

```bash
cd mobile/my-app
npm run lint
```

```bash
cd web/muj-next-app
npm run lint
npx tsc --noEmit
```

```bash
python -m py_compile Python/Main.py
```

## Bezpecnostni poznamky

- API klice a tokeny nepatri do Gitu.
- `.env`, `.env.local` a databazove soubory maji zustat pouze lokalne.
- Strava tokeny jsou ulozene v SQLite databazi.
- Mobilni aplikace pouziva `session_id` pro komunikaci s backendem.
- AI vysledky je nutne prezentovat jako orientacni interpretaci, ne jako zdravotni diagnostiku.

## Omezeni

- Presnost vypoctu zavisi na kvalite dat ze Stravy.
- Cast metrik vyzaduje dostupny tep.
- VO2max je pouze orientacni odhad.
- ACWR a TRIMP jsou zjednodusene treninkove ukazatele.
- AI vyhodnoceni muze byt pouzito jen jako doplnkova interpretace.

## Vztah k bakalarske praci

Projekt lze v textu bakalarske prace popsat jako mobilni aplikaci pro analyzu bezeckeho treninku. Prakticka cast kombinuje mobilni klient, backendove API, vypocetni sluzbu, databazi, integraci se Stravou a AI interpretaci treninkovych dat.

Pro obhajobu je vhodne doplnit:

- diagram architektury
- ER diagram databaze
- popis OAuth flow
- popis vypoctu treninkovych metrik
- screenshoty mobilni aplikace
- testovaci scenare
- limity pouzitych dat a AI vystupu
