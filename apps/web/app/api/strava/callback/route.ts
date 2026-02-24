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

  return Response.json({
    message: "Token exchange OK",
    stravaStatus: stravaRes.status,
    data,
  });
}