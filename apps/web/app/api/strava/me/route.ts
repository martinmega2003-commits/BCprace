import { prisma } from "@/app/lib/prisma";




export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

    const athleteIdParam = searchParams.get("athleteId");

  if (!athleteIdParam) {
    return Response.json(
      { error: "Chybi AthleteID v query" },
      { status: 400 }
    );
  }
  const athleteId = Number(athleteIdParam);

  if(!Number.isInteger(athleteId)){
      return Response.json(
    { error: "athleteId musi byt cislo" },
    { status: 400 }
  );
}

const account = await prisma.stravaAccount.findUnique({
  where: { stravaAthleteId: athleteId },
});

if (!account) {

  return Response.json(
    { error: "Strava ucet nebyl nalezen v DB" },
    { status: 404 }
  );
}
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const isExpired = account.expiresAt <= nowInSeconds + 60;




if (isExpired) {
  const refreshRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID ?? "",
      client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
    }),
  });

  const refreshData = await refreshRes.json();

  if (!refreshRes.ok) {
    return Response.json(
      {
        message: "Refresh failed",
        refreshStatus: refreshRes.status,
        refreshData,
      },
      { status: 400 }
    );
  }

  const updatedAccount = await prisma.stravaAccount.update({
    where: { stravaAthleteId: account.stravaAthleteId },
    data: {
      accessToken: refreshData.access_token,
      refreshToken: refreshData.refresh_token,
      expiresAt: refreshData.expires_at,
    },
  });

  return Response.json({
    message: "Refresh + save OK",
    athleteId: updatedAccount.stravaAthleteId,
    expiresAt: updatedAccount.expiresAt,
  });
}



return Response.json({
  message: "Account loaded",
  athleteId: account.stravaAthleteId,
  expiresAt: account.expiresAt,
  nowInSeconds,
  isExpired,
});


}