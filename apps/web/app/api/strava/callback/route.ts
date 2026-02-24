import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    return Response.json(
      { error: "Chybi code v callbacku" },
      { status: 400 }
    );
  }

    const stravaRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
      body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID ?? "",
      client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
    }),
  });
  
  const data = await stravaRes.json();


  if (!stravaRes.ok) {
  return Response.json(
    {
      message: "Token exchange failed",
      stravaStatus: stravaRes.status,
      data,
    },
    { status: 400 }
  );
}

if (!data.athlete?.id) {
  return Response.json(
    { error: "Strava response nema athlete.id" },
    { status: 500 }
  );
}

const savedAccount = await prisma.stravaAccount.upsert({
  where: {
    stravaAthleteId: data.athlete.id,
  },
  update: {
    firstname: data.athlete.firstname ?? null,
    lastname: data.athlete.lastname ?? null,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  },
  create: {
    stravaAthleteId: data.athlete.id,
    firstname: data.athlete.firstname ?? null,
    lastname: data.athlete.lastname ?? null,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  },
});

return Response.json({
  message: "Token exchange + save OK",
  stravaStatus: stravaRes.status,
  athleteId: savedAccount.stravaAthleteId,
});


}


