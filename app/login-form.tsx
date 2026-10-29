"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || isPending) return;
    setIsPending(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się zalogować.");
    } catch {
      setError("Brak połączenia z serwerem.");
    }
    setIsPending(false);
  }

  return (
    <main className="login">
      <h1>Mój chatbot</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="password">Wpisz hasło</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={!password || isPending}>
          {isPending ? "Sprawdzam…" : "Wejdź"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
