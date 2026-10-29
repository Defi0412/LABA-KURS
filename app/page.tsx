import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/session";
import Chat from "./chat";
import LoginForm from "./login-form";

export default async function Home() {
  const cookieStore = await cookies();
  const loggedIn = isValidSession(cookieStore.get(SESSION_COOKIE)?.value);

  return loggedIn ? <Chat /> : <LoginForm />;
}
