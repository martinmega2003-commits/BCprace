import { prisma } from "@/app/lib/prisma";



export async function POST(request: Request) {
    const body = await request.json()
    const athleteId = Number(body.athleteId);

    if (!Number.isInteger(athleteId)) {
    return Response.json({ error: "athleteId musi byt cislo" }, { status: 400 });
  }


  await prisma.stravaAccount.delete({
    where: { stravaAthleteId: athleteId },
  });

  return Response.json({ message: "Logout OK", athleteId });

}