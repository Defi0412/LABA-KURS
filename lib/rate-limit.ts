// UWAGA: ten licznik żyje w pamięci jednego procesu serwera.
// Restart go zeruje, a na hostingu z wieloma instancjami każda liczy osobno.
// To ochrona lokalna, NIE globalna — na hostingu dodaj limit po stronie
// platformy (np. regułę rate limit w firewallu hostingu).

const WINDOW_MS = 15 * 60 * 1000; // 15 minut
const MAX_FAILURES_PER_IP = 5;
const MAX_FAILURES_TOTAL = 30; // chroni też przed podmienianiem adresu IP
const TOTAL_KEY = "*";

type Entry = { count: number; resetAt: number };
const failures = new Map<string, Entry>();

function activeEntry(key: string, now: number) {
  const entry = failures.get(key);
  if (entry && entry.resetAt <= now) {
    failures.delete(key);
    return undefined;
  }
  return entry;
}

export function isLimited(ip: string) {
  const now = Date.now();
  return (
    (activeEntry(ip, now)?.count ?? 0) >= MAX_FAILURES_PER_IP ||
    (activeEntry(TOTAL_KEY, now)?.count ?? 0) >= MAX_FAILURES_TOTAL
  );
}

export function recordFailure(ip: string) {
  const now = Date.now();
  for (const key of [ip, TOTAL_KEY]) {
    const entry = activeEntry(key, now);
    if (entry) entry.count++;
    else failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }

  // Sprzątanie, żeby mapa nie rosła bez końca.
  if (failures.size > 10_000) {
    for (const key of failures.keys()) activeEntry(key, now);
  }
}

// Po poprawnym haśle oddajemy wcześniej zarezerwowaną próbę.
export function refundAttempt(ip: string) {
  failures.delete(ip);
  const total = activeEntry(TOTAL_KEY, Date.now());
  if (total && total.count > 0) total.count--;
}
