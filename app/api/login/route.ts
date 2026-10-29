import { NextResponse } from "next/server";
import { clearFailures, isLimited, recordFailure } from "@/lib/rate-limit";
import {
  checkPassword,
  createSessionToken,
  getAuthConfig,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionCookieOptions,
} from "@/lib/session";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(req: Request) {
  const config = getAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Wejście jest zablokowane: serwer nie ma ustawionych CHAT_PASSWORD i SESSION_SECRET." },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  if (isLimited(ip)) {
    return NextResponse.json(
      { error: "Za dużo błędnych prób. Spróbuj ponownie za 15 minut." },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.password === "string") password = body.password.slice(0, 200);
  } catch {
    // Brak lub zły JSON — traktujemy jak puste hasło.
  }

  if (!checkPassword(password, config.password)) {
    recordFailure(ip);
    // Krótkie opóźnienie spowalnia zgadywanie.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  clearFailures(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(config.secret), {
    ...sessionCookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
