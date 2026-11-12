# Fáze 1: Testy a CI – návrh

Datum: 2026-11-12 · Autor: Martin Mega (s pomocí Claude)

## Kontext

Projekt se přesunul ze SQLite na PostgreSQL (Azure Database for PostgreSQL + Key Vault).
Stávající testy (`Python/tests/test_training_metrics.py`, 8 scénářů) počítají se SQLite a nefungují.
Celkový plán „silného základu“ má tři fáze; tento dokument řeší jen fázi 1:

1. **Testy a CI** (tento dokument)
2. Odstranění Stravy + demo účet (samostatný návrh)
3. Bezpečnost a konfigurace (samostatný návrh)

Cíl fáze 1: záchranná síť pro fáze 2 a 3. Do Azure se nasadí jen kód, který projde testy.

## Rozhodnutí

### Testovací databáze
- Lokálně: samostatná databáze `bcprace_test` ve stávajícím kontejneru `rebulid01-db`. Běžná data v `bcprace` se testy nikdy nedotknou.
- CI (GitHub Actions): služba `postgres:17` (stejná hlavní verze jako v Azure).
- Před každým testem se aplikuje `DB/schema.sql` (smaže a vytvoří tabulky) → každý test začíná s čistou databází.
- Testy se připojují přes proměnnou `DATABASE_URL`. Ochrana: testovací kód odmítne běžet, pokud název databáze nekončí na `_test`.

### Python (pytest)
- Nástroj: `pytest` + FastAPI `TestClient` (balíčky `pytest`, `httpx` v `Python/requirements-dev.txt`, ne v produkční image).
- 8 stávajících scénářů přepsat na PostgreSQL: test vloží data přes SQL, zavolá endpoint, ověří odpověď a stav v databázi.
- Volání Azure OpenAI se v testech nahradí falešnou odpovědí (mock), testy nic nestojí a nepotřebují internet.
- Sdílené pomůcky (připojení, reset schématu, vložení uživatele/aktivity) v `Python/tests/conftest.py`.

### Web (Vitest)
- Nástroj: `vitest`.
- Rozsah: `lib/session.ts` (platná / neplatná / vypršelá session) a izolace dat – route vrací jen data přihlášeného uživatele (`activities`, `activity`, `me`).
- Volání Python API se v testech nahradí falešnou odpovědí.

### Kvalita kódu
- Python: `ruff check` (linter). Formátování (`ruff format`) zatím ne – byl by to obrovský diff přes celý `Main.py`.
- Web: `eslint` (existuje) + `tsc --noEmit`.

### Pipeline
- Nový workflow `.github/workflows/ci.yml`: běží při každém pushi a pull requestu na jakoukoli větev. Joby: `python` (ruff + pytest), `web` (eslint + tsc + vitest).
- `deploy.yml` se spustí až po úspěšném CI na `main` (`workflow_run`), nikdy po neúspěšném.

## Mimo rozsah
- Testy mobilní aplikace, end-to-end testy v prohlížeči.
- Rozdělení `Main.py` do více souborů, přejmenování endpointů.
- Testy Strava rout (v fázi 2 se smažou).

## Hotovo, když
- `pytest` lokálně i v CI: všech 8 scénářů zelených na PostgreSQL.
- `vitest`: testy session a izolace dat zelené.
- `ruff`, `eslint`, `tsc` bez chyb.
- Push s rozbitým testem **nenasadí** novou verzi do Azure (ověřeno schválně rozbitým testem).
