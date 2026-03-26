import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";


export async function GET(req: NextRequest) {

    const url = new URL(req.url);
    const cookieSessionId = req.cookies.get("session_id")?.value;
    const querySessionId = url.searchParams.get("session_id");
    const sessionID = cookieSessionId || querySessionId;


  const deleteSessionStatement = db.prepare("DELETE FROM sessions WHERE id = ?")

  const selectUserStatement = db.prepare("SELECT user_id FROM sessions WHERE id=?")

  const deleteUserTokenStatement = db.prepare("DELETE FROM strava_tokens WHERE user_id = ?")

  if(!sessionID){
    return NextResponse.json({ok: false, message: "missing sessionID"}, {status: 400})
  }

const UserRow = selectUserStatement.get(sessionID) as { user_id: number } | undefined
 
   if(!UserRow){
    return NextResponse.json({ok: false, message: "missing userRow"}, {status: 400})
  }

  deleteSessionStatement.run(sessionID);
  deleteUserTokenStatement.run(UserRow.user_id)



  const response = NextResponse.json({ok: true,  message: "uspesny logout", sessionID})
  response.cookies.delete("session_id")

  
  return response
}
  