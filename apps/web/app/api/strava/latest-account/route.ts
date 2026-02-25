import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const account = await prisma.stravaAccount.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      stravaAthleteId: true,
      firstname: true,
      lastname: true,
      updatedAt: true,
    },
  });

  if (!account) {
    return Response.json(
      { error: "Zadny Strava ucet v DB" },
      { status: 404 }
    );
  }

  return Response.json({
    athleteId: account.stravaAthleteId,
    firstname: account.firstname,
    lastname: account.lastname,
    updatedAt: account.updatedAt,
  });
}
