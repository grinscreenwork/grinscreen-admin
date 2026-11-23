"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { clearFailures, recordFailure, tooManyAttempts } from "@/lib/rate-limit";

export type LoginState = { error?: string };

// Who is an admin? Anyone you've created in Supabase Auth (Authentication → Users).
// They sign in with their email and password, no extra setup.

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${ip}:${email}`;
  if (tooManyAttempts(key)) return { error: "Too many attempts. Please try again in 15 minutes." };

  // Credentials are checked by Supabase Auth with a throwaway, stateless client.
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    recordFailure(key);
    if (error && !/invalid login credentials/i.test(error.message)) {
      console.error("[auth] sign-in failed:", error.message); // detail for the developer's logs only
    }
    if (error && /not confirmed/i.test(error.message)) {
      return { error: "This account's email hasn't been confirmed yet. Please check your inbox." };
    }
    return { error: "Incorrect email or password." };
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
