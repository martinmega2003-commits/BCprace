import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { GetTokenFromUser } from "@/lib/session"

export async function POST() {
    const tokenHash = await GetTokenFromUser()
    if(tokenHash){
        await queryOne("DELETE FROM sessions WHERE token_hash = $1", [tokenHash])
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.delete('session')

    return response




}