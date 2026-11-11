import { NextRequest, NextResponse } from "next/server";
import { pool, queryOne } from "@/lib/db";
import { getSessionId } from "@/lib/session";

export async function GET(req: NextRequest) {
    const sessionID = getSessionId(req);
    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "missing sessionID" }, { status: 400 });
    }

    // smazat session a rovnou zjistit, komu patrila
    const deleted = await queryOne<{ user_id: number }>(
        "DELETE FROM sessions WHERE id = $1 RETURNING user_id",
        [sessionID],
    );

    if (!deleted) {
        return NextResponse.json({ ok: false, message: "missing userRow" }, { status: 400 });
    }

    // DOCASNE: vymazat tokeny ke Strave (propojeni uctu zustava, aby se pri dalsim prihlaseni nasel stejny uzivatel)
    await pool.query(
        "UPDATE strava_accounts SET access_token = NULL, refresh_token = NULL, expires_at = NULL, updated_at = now() WHERE user_id = $1",
        [deleted.user_id],
    );

    const response = NextResponse.json({ ok: true, message: "uspesny logout", sessionID });
    response.cookies.delete("session_id");

    return response;
}
