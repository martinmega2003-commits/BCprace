import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";



export async function GET(req: NextRequest) {

    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const sessionID = cookieSessionId || querySessionId;

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }




    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?");
    const UserSelectStatement = db.prepare("SELECT username, profile_medium, sex, height_cm, birth_date, weight_kg, rest_heartrate, awrs FROM users WHERE id=?")
            
    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined;

    if (!userRow) {
        return NextResponse.json({ ok: false, message: "Chybi userId" });
    }

    const profileRow = UserSelectStatement.get(userRow.user_id) as
    | {
        username: string;
        profile_medium: string | null;
        sex: string | null;
        height_cm: number | null;
        birth_date: string | null;
        weight_kg: number | null;
        rest_heartrate: number | null
        awrs: number | null
        }
    | undefined;

    
    if(!profileRow){
        return NextResponse.json({ ok: false, message: "Chybi profilerow" });

    }


return NextResponse.json({
    ok: true,
    username: profileRow.username,
    profile_medium: profileRow.profile_medium,
    sex: profileRow.sex,
    height_cm: profileRow.height_cm,
    birth_date: profileRow.birth_date,
    weight_kg: profileRow.weight_kg,
    rest_heartrate: profileRow.rest_heartrate,
    awrs: profileRow.awrs
});
}



export async function PATCH(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";
    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const sessionID = cookieSessionId || querySessionId;

    if (!sessionID) {
        return NextResponse.json({ ok: false, message: "Chybi session" });
    }

    const body = await req.json();

    
    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id = ?");
    const updateUserStatement = db.prepare("UPDATE users SET sex = ?, height_cm = ?, birth_date = ?, weight_kg = ?, rest_heartrate = ? WHERE id = ?");



    const username = body.username
    const sex = body.sex
    const height_cm = body.height_cm
    const birth_date = body.birth_date
    const weight_kg = body.weight_kg
    const rest_heartrate = body.rest_heartrate


    const userRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined;

    if(!userRow){
        return NextResponse.json({ok:false, message: "Chybi userid"});
    }

    updateUserStatement.run(sex, height_cm, birth_date, weight_kg, rest_heartrate, userRow.user_id)
    await fetch(`${pythonApiUrl}/IntesityCalcul?user_id=${userRow.user_id}`)

    return NextResponse.json({ ok: true, message: "vse probehlo ok" });

}
