import { NextResponse } from "next/server";

export async function GET() {
    
    const url = new URL("https://www.strava.com/oauth/authorize");

      url.searchParams.set("client_id",process.env.STRAVA_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", process.env.STRAVA_REDIRECT_URI ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");

  return NextResponse.redirect(url);

}
