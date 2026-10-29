import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/session";

// Pozwala na dłuższe odpowiedzi strumieniowe (w sekundach).
export const maxDuration = 30;

export async function POST(req: Request) {
  // Najpierw sesja — bez niej nie wywołujemy modelu.
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(SESSION_COOKIE)?.value)) {
    return new Response("Sesja wygasła lub nie jesteś zalogowany. Odśwież stronę i wpisz hasło.", {
      status: 401,
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey || !model) {
    return new Response(
      "Brak konfiguracji: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL w pliku .env.local, a potem uruchom serwer ponownie.",
      { status: 500 },
    );
  }

  // Cała historia bieżącej rozmowy przychodzi z przeglądarki.
  const { messages }: { messages: UIMessage[] } = await req.json();

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter(model),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error(error);
        const details = error instanceof Error ? error.message : String(error);
        return `Nie udało się uzyskać odpowiedzi od modelu. Szczegóły: ${details}`;
      },
    }),
  });
}
