import { Pool, types } from "pg";

// BIGINT (id) by jinak prislo jako text -> chceme cislo, jak to mobil cekal ze SQLite
types.setTypeParser(20, (value) => parseInt(value, 10));
// DATE (napr. birth_date) by se jinak prevedlo na Date s casovym posunem -> nechame text "YYYY-MM-DD"
types.setTypeParser(1082, (value) => value);

// Pool = nekolik pripojeni pripravenych dopredu, sdilenych mezi pozadavky.
// Adresa databaze prijde z promenne prostredi, ne z kodu.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Vrati vsechny radky dotazu. Hodnoty se predavaji jako $1, $2, ... (ochrana proti SQL injection). */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Vrati prvni radek dotazu, nebo undefined. */
export async function queryOne<T>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}
