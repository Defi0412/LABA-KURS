import { NextResponse } from "next/server";
import { isLimited, recordFailure, refundAttempt } from "@/lib/rate-limit";
import {
  checkPassword,
  createSessionToken,
  getAuthConfig,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionCookieOptions,
} from "@/lib/session";

// Na Vercel ten nagłówek ustawia sama platforma. Lokalnie da się go podrobić,
// dlatego w lib/rate-limit.ts jest też limit łączny dla wszystkich.
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
  // Rezerwujemy próbę od razu, zanim cokolwiek poczeka (await),
  // żeby równoległe żądania nie ominęły limitu.
  recordFailure(ip);

  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.password === "string") password = body.password.slice(0, 200);
  } catch {
    // Brak lub zły JSON — traktujemy jak puste hasło.
  }

  if (!checkPassword(password, config.password)) {
    // Krótkie opóźnienie spowalnia zgadywanie.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  refundAttempt(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(config.secret), {
    ...sessionCookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
