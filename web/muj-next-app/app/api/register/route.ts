import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import{ hashPassword } from "@/lib/password"
import { z } from "zod"
import { randomBytes, createHash } from "node:crypto";
import { sendVerificationEmail } from "@/lib/mail";


const registerSchema = z.object({
    email:z.string().trim().toLowerCase().max(254).pipe(z.email()),
    password:z.string().min(8).max(200), 
    username:z.string().trim().min(1).max(50)
})


export async function POST(request: Request) {
      const body = await request.json()
      const result = registerSchema.safeParse(body)

    if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
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
        const verifyToken = randomBytes(32).toString("base64url")
        const verifyTokenHash = createHash("sha256").update(verifyToken).digest("hex")

        
        await queryOne(
            `INSERT INTO email_verifications (token_hash, user_id, expires_at)
            VALUES ($1, $2, now() + interval '24 hours')`,
            [verifyTokenHash, user.id],
        );
    
        
        await sendVerificationEmail(user.email, `http://localhost:3000/api/verify-email?token=${verifyToken}`)


        return NextResponse.json(user, { status: 201 });
        } catch (error) {
            // 23505 = kod chyby PostgreSQL pro porušení UNIQUE (e-mail uz existuje)
            if ((error as { code?: string }).code === "23505") {
                return NextResponse.json({ error: "účet s tímto e-mailem už existuje" }, { status: 409 });
            }
            // jina chyba (napriklad nebezi databaze) -> nechame ji spadnout jako 500
            throw error;
        }
    } 
  