import { NextResponse, type NextRequest } from "next/server";
import { vytvorLimiter } from "@/lib/rateLimit";


const smiProjit = vytvorLimiter(60,60_000);

export function proxy(request: NextRequest){
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "neznama";

    if (!smiProjit(ip)) {
        return NextResponse.json({ ok: false, message: "Prilis mnoho pozadavku" }, { status: 429 });
    }

    return NextResponse.next();

}

export const config = {
  matcher: "/api/:path*",
};
