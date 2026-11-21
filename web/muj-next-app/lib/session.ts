import {  headers } from "next/headers";
import { createHash } from "crypto";
import { queryOne } from "./db";

export async function GetTokenFromUser() {
        const  hlavicka = await headers()
        const authorization = hlavicka.get("authorization")
        
        if (!authorization?.startsWith("Bearer ")) {
        return null;
    }

    const token = authorization.substring(7);
    const tokenHash = createHash("sha256").update(token).digest("hex")

    return tokenHash
    
    }



export async function getCurrentUser () {

    const tokenHash = await GetTokenFromUser()

    if (tokenHash === null){
        return null
    }


    const session = await queryOne<{ user_id: number }>(
        "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()",
        [tokenHash],
    );
    if (!session) {
        return null
    }

    // 2. najdi uzivatele, kteremu prihlaseni patri
    const user = await queryOne<{ id: number; email: string; username: string; role: string }>(
        "SELECT id, email, username, role FROM users WHERE id = $1",
        [session.user_id],
    );
    return user    
}   