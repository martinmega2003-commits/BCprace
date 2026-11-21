import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
    const pythonApiUrl = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

        const user = await getCurrentUser();
        if(!user){
            return NextResponse.json({ ok: false, message: "Nejsi prihlaseny" }, { status: 401 });
        }
    

    const PythonCall = await fetch(`${pythonApiUrl}/ai/?user_id=${user.id}`);
    if (!PythonCall.ok) {
        return NextResponse.json({ ok: false, message: "missing PythonCall" }, { status: 400 });
    }

    const Result = await PythonCall.json();
    return NextResponse.json(Result);
}
