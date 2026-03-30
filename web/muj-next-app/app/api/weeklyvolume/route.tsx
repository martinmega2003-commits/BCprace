import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const sessionID = cookieSessionId || querySessionId;

    
    
    const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id=?")



    if(!sessionID){
        return NextResponse.json({ok: false, message: "missing sessionID"}, {status: 400})
    }

    const UserRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined

    if(!UserRow){
        return NextResponse.json({ok: false, message: "missing MISSING uSERrOW"}, {status: 400})
    }

    const usedId = UserRow.user_id

    const PythonCall = await fetch(`${pythonApiUrl}/weeklyvolume/?user_id=${usedId}`)
    
    const Result =await PythonCall.json()

    return NextResponse.json(Result);
}
