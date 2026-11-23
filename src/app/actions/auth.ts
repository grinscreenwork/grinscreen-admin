"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { clearFailures, recordFailure, tooManyAttempts } from "@/lib/rate-limit";

export type LoginState = { error?: string };

// Who is an admin? Whoever you've authorized in Supabase Auth (Authentication → Users).
// There is no email list in this app. The one safeguard: if the project lets the public
// create their own accounts, "any Supabase user" would mean "anyone on the internet",
// so sign-in is refused until public sign-ups are switched off in Supabase.
let signupCache: { at: number; open: boolean | null } | null = null;

async function publicSignupsOpen(): Promise<boolean | null> {
  if (signupCache && Date.now() - signupCache.at < 60_000) return signupCache.open;
  let open: boolean | null = null;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) open = (await res.json()).disable_signup === false;
  } catch {
    open = null; // couldn't tell
  }
  signupCache = { at: Date.now(), open };
  return open;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${ip}:${email}`;
  if (tooManyAttempts(key)) return { error: "Too many attempts. Try again in 15 minutes." };

  // Credentials are checked by Supabase Auth with a throwaway, stateless client.
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    recordFailure(key);
    if (error && /not confirmed/i.test(error.message)) return { error: "Confirm your email in Supabase first." };
    return { error: "Incorrect email or password." };
  }

  // Valid Supabase user. Only let them in if the public can't just register themselves.
  if (process.env.ALLOW_OPEN_SIGNUPS !== "true") {
    const open = await publicSignupsOpen();
    if (open !== false) {
      return {
        error:
          open === true
            ? "Your password is correct, but public sign-ups are enabled on your Supabase project, so anyone could register and become an admin. In Supabase go to Authentication → Sign In / Providers and turn off “Allow new users to sign up”, then sign in again."
            : "Couldn't verify your Supabase sign-up settings. Please try again in a moment.",
      };
    }
  }

  clearFailures(key);
  const token = await signSession({ sub: data.user.id, username: (data.user.email ?? email).toLowerCase() });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
