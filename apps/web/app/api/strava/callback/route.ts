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


const activitiesRes = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=200",
    {
      headers:{
              Authorization: `Bearer ${data.access_token}`,
      },
    }
);
const activities = await activitiesRes.json();

if (Array.isArray(activities)) {
  for (const activity of activities) {
    await prisma.stravaActivity.upsert({
      where: {
        stravaActivityId: BigInt(activity.id),
      },
      update: {
        stravaAthleteId: data.athlete.id,
        name: activity.name ?? null,
        type: activity.type ?? null,
        sportType: activity.sport_type ?? null,
        distance: activity.distance ?? null,
        movingTime: activity.moving_time ?? null,
        elapsedTime: activity.elapsed_time ?? null,
        startDate: activity.start_date ? new Date(activity.start_date) : null,
        timezone: activity.timezone ?? null,
      },
      create: {
        stravaActivityId: BigInt(activity.id),
        stravaAthleteId: data.athlete.id,
        name: activity.name ?? null,
        type: activity.type ?? null,
        sportType: activity.sport_type ?? null,
        distance: activity.distance ?? null,
        movingTime: activity.moving_time ?? null,
        elapsedTime: activity.elapsed_time ?? null,
        startDate: activity.start_date ? new Date(activity.start_date) : null,
        timezone: activity.timezone ?? null,
      },
    });
  }
}



const response = Response.json({
  message: "ALL GOOD GET BACK TO APP",
  athleteId: savedAccount.stravaAthleteId,
  activitiesStatus: activitiesRes.status,
activitiesCount: Array.isArray(activities) ? activities.length : null,

});

response.headers.append(
  "Set-Cookie",
  `stravaAthleteId=${savedAccount.stravaAthleteId}; Path=/; HttpOnly; SameSite=Lax`
);

return response;

}
