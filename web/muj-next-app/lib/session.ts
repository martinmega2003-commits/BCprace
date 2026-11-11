import { NextRequest } from "next/server";
import { queryOne } from "@/lib/db";

/** Session ID z cookie, pripadne z URL (mobilni aplikace ho zatim posila v URL). */
export function getSessionId(req: NextRequest): string | null {
  const url = new URL(req.url);
  return req.cookies.get("session_id")?.value || url.searchParams.get("session_id");
}

/** Vrati ID prihlaseneho uzivatele, nebo null. Vyprsela session se nepocita. */
export async function getUserIdFromSession(sessionId: string): Promise<number | null> {
  const row = await queryOne<{ user_id: number }>(
    "SELECT user_id FROM sessions WHERE id = $1 AND expires_at > now()",
    [sessionId],
  );
  return row?.user_id ?? null;
}
