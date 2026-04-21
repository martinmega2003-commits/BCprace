import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest){
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if(error){
        return NextResponse.json({ok: false, error},{ status:400});
    }

    
    if(!code){
        return NextResponse.json({ ok: false, message: "Missing code" }, { status: 400 });
    }

    if(!state){
        return NextResponse.json({ ok: false, message: "Missing state" }, { status: 400 });
    }
    const StateSearchStatment = db.prepare("SELECT state FROM oauth_states WHERE state = ?")

    const savedState = StateSearchStatment.get(state)

    if (!savedState) {
        return NextResponse.json({ ok: false, message: "Invalid state" }, { status: 400 });
    }


    const DeleteStateStatement = db.prepare("DELETE FROM oauth_states WHERE state = ?")
    DeleteStateStatement.run(state)



    const token = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers:{
                "Content-Type": "application/json"
        },
        body:JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
        })
    
    })

    const data = await token.json();
    if(!token.ok){
        return NextResponse.json({ ok: false, message: "Missing token" }, { status: 400 });
    }

    if(!data){
        return NextResponse.json({ ok: false, message: "Missing data" }, { status: 400 });
    }

    if(!data.athlete){
        return NextResponse.json({ ok: false, message: "Missing dataahlete" }, { status: 400 });

    }

    const athleteId = data.athlete.id;
    const username = data.athlete.username;
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresAt = data.expires_at;
    const rawProfileMedium = data.athlete.profile_medium
    const profile_medium =
     typeof rawProfileMedium === "string" && rawProfileMedium.startsWith("http")
    ? rawProfileMedium
    : null;

    const rawProfile = await fetch("https://www.strava.com/api/v3/athlete", {
        method: "GET",
        headers:{
            Authorization: `Bearer ${accessToken}`
        },
    })


    const profileData = await rawProfile.json()

    if(!profileData){
        return NextResponse.json({ok: false, message: "chybi profile data"},{status: 400})
    }

    const searchUserStatement = db.prepare<{ id: number; strava_athlete_id: number }>("SELECT id, strava_athlete_id FROM users WHERE strava_athlete_id = ?")

    const insertStatement = db.prepare("INSERT INTO users (strava_athlete_id, username, profile_medium, sex, height_cm, birth_date, weight_kg) VALUES (?, ?, ?, ?, ?, ?, ?)")
    
    const insertSessionStatement = db.prepare("INSERT INTO sessions (id ,user_id, expires_at) values(?, ?, ?)")

    const statement = db.prepare("INSERT INTO strava_tokens (user_id, athlete_id, access_token, refresh_token, expires_at) VALUES (? ,? , ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at")

    const UpdateMedium = db.prepare("UPDATE users SET profile_medium = ?, sex = ?, weight_kg = ? WHERE id = ?")

    const user = searchUserStatement.get(athleteId) as { id: number; strava_athlete_id: number } | undefined


    let userID;

    if(!user){
        const createUser = insertStatement.run(
            athleteId,
            username,
            profile_medium,
            profileData.sex,
            null,
            null,
            profileData.weight
            )
        userID = createUser.lastInsertRowid
    }else{
        userID = user.id
        UpdateMedium.run(profile_medium, profileData.sex, profileData.weight, user.id)
    }
    
    const sessionId = crypto.randomUUID()
    const sessionExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const sessionExpireAt = sessionExpire.toISOString()
    insertSessionStatement.run(sessionId, userID, sessionExpireAt)

    statement.run(userID ,athleteId, accessToken, refreshToken, expiresAt )

    const RedirectURL = new URL('myapp://auth/callback')
    RedirectURL.searchParams.set("session_id", sessionId)

    
    const response = NextResponse.redirect(RedirectURL);
    response.cookies.set("session_id", sessionId)
    
    return response
}
