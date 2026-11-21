import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { createHash } from "node:crypto";


export async function GET(request:Request) {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    if (!token){
        return NextResponse.json({ error: "chybí token" }, { status: 400 });
    }
    const tokenHash  = createHash("sha256").update(token).digest("hex")


    const verification = await queryOne<{ user_id: number }>(
        `SELECT user_id FROM email_verifications WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash],
    )
    if (!verification){
                return NextResponse.json({ error: "neplatny odkaz" }, { status: 400 });
    }

    await queryOne(
        `UPDATE users SET email_verified_at = now() WHERE id = $1`,
        [verification.user_id]
    )
    await queryOne(`DELETE FROM email_verifications WHERE user_id = $1`,
        [verification.user_id]
    )

    return NextResponse.json({ ok: true, message: "e-mail je ověřený, můžeš se přihlásit" });
}

