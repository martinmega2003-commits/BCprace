import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import{ verifyPassword } from "@/lib/password"
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { BLOKACE_SEKUND, getClientIp, isLoginBlocked, recordLoginAttempt } from "@/lib/login-attempts";


export async function POST(request: Request) {
    const body = await request.json()
    const email = body.email
    if(!email){
        return NextResponse.json({error:"chybi email"}, {status:400});
    }
    const password = body.password
    if(!password){
        return NextResponse.json({error:"chybi password"},  {status:400});
    }
    const cleanemail= email.trim().toLowerCase()

    // ochrana proti hadani hesla: kontrola PRED overenim hesla,
    // jinak by utocnik mohl zkouset dal a jen by nevidel vysledek
    const ip = getClientIp(request)
    if (await isLoginBlocked(cleanemail, ip)) {
        return NextResponse.json(
            { error: "příliš mnoho neúspěšných pokusů, zkus to za 15 minut" },
            { status: 429, headers: { "Retry-After": String(BLOKACE_SEKUND) } },
        );
    }

    const user = await queryOne<{ id: number; password_hash: string, email_verified_at: string | null, username: string }>(
        `SELECT id, password_hash, email_verified_at, username
         FROM users
         WHERE email = $1`,
        [cleanemail]

    );
        if(!user){
            await recordLoginAttempt(cleanemail, ip, false)
            return NextResponse.json({error:"Heslo nebo email je špatne"}, {status:401});
        }

    const passwordOK = await verifyPassword(user.password_hash, password)

    if (!passwordOK){
        await recordLoginAttempt(cleanemail, ip, false)
        return NextResponse.json({error:"Heslo nebo email je špatne"},{status:401})
    }
    if(!user.email_verified_at){
        return NextResponse.json({error:"Overte email"},{status:403})
    }

    await recordLoginAttempt(cleanemail, ip, true)

    const token = randomBytes(32).toString("base64url")
    const hashToken = createHash("sha256").update(token).digest("hex")

    await queryOne(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + interval '7 days')`,
        [hashToken, user.id],
    );

    const response = NextResponse.json({ ok: true, token, username: user.username });

    response.cookies.set(
        "session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite:"lax",
            path:"/",
            maxAge: 60*60*24*7,

        });
     return response;
}
