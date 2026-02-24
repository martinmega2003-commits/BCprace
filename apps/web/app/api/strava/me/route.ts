export async function GET() {
  const accessToken = process.env.STRAVA_ACCESS_TOKEN;

  if (!accessToken) {
    return Response.json(
      { error: "Chybi STRAVA_ACCESS_TOKEN v .env.local" },
      { status: 500 }
    );
  }

  const stravaRes = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
      cache: "no-store",
  signal: AbortSignal.timeout(10000),
});
  

  const data = await stravaRes.json();

  return Response.json({
    stravaStatus: stravaRes.status,
    data,
  });
}
