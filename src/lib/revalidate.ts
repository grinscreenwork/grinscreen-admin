import "server-only";

/** Tell the public site to refresh its cached pages. Never throws; the admin must not fail because the site is down. */
export async function revalidateClient(): Promise<void> {
  const base = process.env.CLIENT_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return;
  try {
    await fetch(new URL("/api/revalidate", base), {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
  } catch {
    // best effort: the public site also refreshes on a timer
  }
}
