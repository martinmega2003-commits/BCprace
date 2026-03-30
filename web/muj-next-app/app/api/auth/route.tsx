import { NextResponse } from "next/server";



export async function GET(){
    const ClientID = process.env.STRAVA_CLIENT_ID;
    const appBaseUrl = process.env.APP_BASE_URL ?? "http://192.168.0.123:3000";
    const redirectURI = `${appBaseUrl}/api/callback`;
    const state = crypto.randomUUID();

    const authURl = `https://www.strava.com/oauth/mobile/authorize?client_id=${ClientID}&response_type=code&redirect_uri=${redirectURI}&scope=read,activity:read,profile:read_all&state=${state}`


    const response = NextResponse.redirect(authURl);

    response.cookies.set("strava_oauth_state", state)

    return response

}   
