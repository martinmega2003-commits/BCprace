import { NextRequest, NextResponse } from "next/server";
import { pool, queryOne } from "@/lib/db";

// DOCASNE: navrat z prihlaseni pres Stravu (odstrani se v kroku 0)
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ ok: false, message: "Missing code" }, { status: 400 });
    }

    if (!state) {
        return NextResponse.json({ ok: false, message: "Missing state" }, { status: 400 });
    }

    // overit a rovnou smazat state (kazdy state jde pouzit jen jednou)
    const savedState = await queryOne("DELETE FROM oauth_states WHERE state = $1 RETURNING state", [state]);
    if (!savedState) {
        return NextResponse.json({ ok: false, message: "Invalid state" }, { status: 400 });
    }

    const token = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
        }),
    });

    const data = await token.json();
    if (!token.ok) {
        return NextResponse.json({ ok: false, message: "Missing token" }, { status: 400 });
    }

    if (!data?.athlete) {
        return NextResponse.json({ ok: false, message: "Missing dataahlete" }, { status: 400 });
    }

    const athleteId = data.athlete.id;
    const username = data.athlete.username;
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresAt = data.expires_at;
    const rawProfileMedium = data.athlete.profile_medium;
    const avatarUrl =
        typeof rawProfileMedium === "string" && rawProfileMedium.startsWith("http") ? rawProfileMedium : null;

    const rawProfile = await fetch("https://www.strava.com/api/v3/athlete", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const profileData = await rawProfile.json();
    if (!profileData) {
        return NextResponse.json({ ok: false, message: "chybi profile data" }, { status: 400 });
    }

    const existing = await queryOne<{ user_id: number }>(
        "SELECT user_id FROM strava_accounts WHERE athlete_id = $1",
        [athleteId],
    );

    let userID: number;

    if (!existing) {
        const created = await queryOne<{ id: number }>(
            "INSERT INTO users (username, avatar_url, sex, weight_kg) VALUES ($1, $2, $3, $4) RETURNING id",
            [username, avatarUrl, profileData.sex, profileData.weight],
        );
        userID = created!.id;
    } else {
        userID = existing.user_id;
        await pool.query("UPDATE users SET avatar_url = $1, sex = $2 WHERE id = $3", [
            avatarUrl,
            profileData.sex,
            userID,
        ]);
    }

    // ulozit / obnovit tokeny ke Strave
    await pool.query(
        `INSERT INTO strava_accounts (user_id, athlete_id, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
             access_token = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             expires_at = EXCLUDED.expires_at,
             updated_at = now()`,
        [userID, athleteId, accessToken, refreshToken, expiresAt],
    );

    const sessionId = crypto.randomUUID();
    const sessionExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
        sessionId,
        userID,
        sessionExpire,
    ]);

    const RedirectURL = new URL("myapp://auth/callback");
    RedirectURL.searchParams.set("session_id", sessionId);

    const response = NextResponse.redirect(RedirectURL);
    response.cookies.set("session_id", sessionId);

    return response;
}
