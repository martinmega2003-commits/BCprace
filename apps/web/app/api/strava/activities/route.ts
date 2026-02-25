import { prisma } from "@/app/lib/prisma";


export async function GET(request: Request) {

    const { searchParams } = new URL(request.url)

    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookieMatch = cookieHeader.match(/(?:^|;\s*)stravaAthleteId=([^;]+)/);
    const athleteIdFromCookie = cookieMatch?.[1] ?? null;

    const athleteIdParam = searchParams.get("athleteId") ?? athleteIdFromCookie;


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
            { status: 400 });
    }


const account =  await prisma.stravaAccount.findUnique({
where: { stravaAthleteId: athleteId },
})

if(!account){

  return Response.json(
    { error: "Strava ucet nebyl nalezen v DB" },
    { status: 404 }
  );
}


const stravaRes = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=1", {
  headers: {
    Authorization: `Bearer ${account.accessToken}`,
  },
});

const activities = await stravaRes.json();
const firstActivity = Array.isArray(activities) ? activities[0] ?? null : null;


return Response.json({
  message: "Activities endpoint ready",
  athleteId: account.stravaAthleteId,
  stravaStatus: stravaRes.status,
  count: Array.isArray(activities) ? activities.length : null,
  firstActivity,
});

}
