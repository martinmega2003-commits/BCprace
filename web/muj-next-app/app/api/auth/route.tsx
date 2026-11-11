import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// DOCASNE: prihlaseni pres Stravu (odstrani se v kroku 0)
export async function GET() {
    const ClientID = process.env.STRAVA_CLIENT_ID;
    const appBaseUrl = process.env.APP_BASE_URL ?? "http://172.20.10.5:3000";
    const redirectURI = `${appBaseUrl}/api/callback`;
    const state = crypto.randomUUID();

    await pool.query("INSERT INTO oauth_states (state) VALUES ($1)", [state]);

    const authURl = `https://www.strava.com/oauth/mobile/authorize?client_id=${ClientID}&response_type=code&redirect_uri=${redirectURI}&scope=read,activity:read,profile:read_all&state=${state}`;

    return NextResponse.redirect(authURl);
}
