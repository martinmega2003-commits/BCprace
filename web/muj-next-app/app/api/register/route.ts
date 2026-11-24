import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import{ hashPassword } from "@/lib/password"
import { z } from "zod"
import { getClientIp } from "@/lib/login-attempts";
import { vytvorLimiter } from "@/lib/rateLimit";
import { posliOvereniEmailu } from "@/lib/verification";

// nejvys 5 registraci za hodinu z jedne IP (kazda posila e-mail a pocita drahy hash hesla)
const smiRegistrovat = vytvorLimiter(5, 60 * 60_000);


const registerSchema = z.object({
    email:z.string().trim().toLowerCase().max(254).pipe(z.email()),
    password:z.string().min(8).max(200), 
    username:z.string().trim().min(1).max(50)
})


export async function POST(request: Request) {
    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: "telo pozadavku neni platny JSON" }, { status: 400 });
    }

    const result = registerSchema.safeParse(body)

    if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // az po validaci, aby preklep ve formulari neubral pokus
    const ip = getClientIp(request)
    if (!smiRegistrovat(ip)) {
        return NextResponse.json(
            { error: "příliš mnoho registrací, zkus to za hodinu" },
            { status: 429, headers: { "Retry-After": "3600" } },
        );
    }

    const cleanusername = result.data.username
    const cleanemail = result.data.email
    const cleanpassword = result.data.password

    const hashedPassword = await hashPassword(cleanpassword)

        try {
        const user = await queryOne<{ id: number; email: string; username: string; role: string }>(
            `INSERT INTO users (email, password_hash, username)
             VALUES ($1, $2, $3)
             RETURNING id, email, username, role`,
            [cleanemail, hashedPassword, cleanusername],
        );

        if (!user) {
            throw new Error("uživatel se nevytvořil")
        }
      
        await posliOvereniEmailu(user.id, user.email)

        return NextResponse.json(user, { status: 201 });
        } catch (error) {
            // 23505 = kod chyby PostgreSQL pro porušení UNIQUE (e-mail uz existuje)
            if ((error as { code?: string }).code === "23505") {
                const existujici = await queryOne<{ id: number; email_verified_at: string | null }>(
                    `SELECT id, email_verified_at FROM users WHERE email = $1`,
                    [cleanemail],
                )
                if (existujici && existujici.email_verified_at !== null) {
                    return NextResponse.json({ error: "účet s tímto e-mailem už existuje" }, { status: 409 });
                }
                // ucet mezitim zmizel -> nechame spadnout jako 500
                if (!existujici) {
                    throw error;
                }

                // neoverený účet přepíšeme novým heslem a jménem (ochrana proti squattingu)
                await queryOne(
                    `UPDATE users
                     SET password_hash = $1, username = $2
                     WHERE id = $3 AND email_verified_at IS NULL`,
                    [hashedPassword, cleanusername, existujici.id],
                )

                // stare overovaci odkazy prestanou platit
                await queryOne(
                    `DELETE FROM email_verifications
                     WHERE user_id = $1`,
                    [existujici.id],
                )

                await posliOvereniEmailu(existujici.id, cleanemail)

                return NextResponse.json({ ok: true }, { status: 201 });
            }
            // jina chyba (napriklad nebezi databaze) -> nechame ji spadnout jako 500
            throw error;
        }
    } 
  