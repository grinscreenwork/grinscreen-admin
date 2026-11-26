import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="GrinScreen" width={56} height={56} loading="eager" fetchPriority="high" decoding="async" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">GrinScreen Admin</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Sign in to manage the website.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
