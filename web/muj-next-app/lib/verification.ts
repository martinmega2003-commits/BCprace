import { queryOne } from "./db";
import { randomBytes, createHash } from "crypto";
import { sendVerificationEmail } from "./mail";

export async function posliOvereniEmailu(user_id:number, email:string) {
        const verifyToken = randomBytes(32).toString("base64url")
        const verifyTokenHash = createHash("sha256").update(verifyToken).digest("hex")

        
        await queryOne(
            `INSERT INTO email_verifications (token_hash, user_id, expires_at)
            VALUES ($1, $2, now() + interval '24 hours')`,
            [verifyTokenHash, user_id],
        );
    
        
        await sendVerificationEmail(email, `${process.env.APP_BASE_URL}/api/verify-email?token=${verifyToken}`)


    
}