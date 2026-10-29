import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Nadpisujemy cookie pustą wartością, która od razu wygasa.
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
