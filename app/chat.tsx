"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Chat() {
  const router = useRouter();
  const { messages, sendMessage, status, error, clearError } = useChat();
  const [text, setText] = useState("");

  const isBusy = status === "submitted" || status === "streaming";
  const canSend = text.trim() !== "" && !isBusy;

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    if (error) clearError();
    sendMessage({ text: text.trim() });
    setText("");
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="chat">
      <header className="header">
        <h1>Mój chatbot</h1>
        <button type="button" className="logout" onClick={handleLogout}>
          Wyjdź
        </button>
      </header>

      <div className="messages">
        {messages.length === 0 ? (
          <p className="empty">Tu pojawi się rozmowa.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              {m.parts.map((part, i) =>
                part.type === "text" ? <span key={i}>{part.text}</span> : null,
              )}
            </div>
          ))
        )}

        {status === "submitted" && <p className="status">Chatbot myśli…</p>}
        {error && <p className="error">{error.message}</p>}
      </div>

      <form className="input-row" onSubmit={handleSend}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość..."
        />
        <button type="submit" disabled={!canSend}>
          {isBusy ? "Czekaj…" : "Wyślij"}
        </button>
      </form>
    </main>
  );
}
