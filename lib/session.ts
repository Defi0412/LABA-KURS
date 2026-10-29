// Tylko dla kodu serwerowego — nie importuj tego w komponentach "use client".
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "chat_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 godzin (w sekundach)

const MIN_SECRET_LENGTH = 32;

// Zwraca null, gdy brakuje konfiguracji — wtedy nikt nie może wejść.
export function getAuthConfig() {
  const password = process.env.CHAT_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret || secret.length < MIN_SECRET_LENGTH) return null;
  return { password, secret };
}

// Porównanie w stałym czasie, niezależnie od długości napisów.
function safeEqual(a: string, b: string) {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function checkPassword(input: string, password: string) {
  return safeEqual(input, password);
}

// Cookie zawiera tylko czas wygaśnięcia, losowy identyfikator i podpis — bez hasła.
export function createSessionToken(secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function isValidSession(token: string | undefined) {
  const config = getAuthConfig();
  if (!config || !token) return false;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload, config.secret))) return false;

  const expiresAt = Number(payload.split(".")[0]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now() / 1000;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
