import "server-only";
import { createServerClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS_EMAIL = 5;
const MAX_ATTEMPTS_IP = 20;
const WINDOW_MINUTES = 5;

function windowStart(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

export async function checkRateLimit(
  email: string,
  ip: string
): Promise<{ blocked: boolean; remaining: number }> {
  try {
    const db = createServerClient();
    const since = windowStart();

    const { count: emailCount } = await db
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("attempted_at", since);

    const count = emailCount ?? 0;
    if (count >= MAX_ATTEMPTS_EMAIL) return { blocked: true, remaining: 0 };

    if (ip) {
      const { count: ipCount } = await db
        .from("login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("attempted_at", since);

      if ((ipCount ?? 0) >= MAX_ATTEMPTS_IP) return { blocked: true, remaining: 0 };
    }

    return { blocked: false, remaining: MAX_ATTEMPTS_EMAIL - count };
  } catch {
    return { blocked: false, remaining: MAX_ATTEMPTS_EMAIL };
  }
}

export async function recordFailedAttempt(
  email: string,
  ip: string | null
): Promise<void> {
  try {
    const db = createServerClient();
    await db.from("login_attempts").insert({ email, ip });
  } catch {
    // intentionally silent — a DB failure must not break the login response
  }
}

export async function clearAttempts(email: string): Promise<void> {
  try {
    const db = createServerClient();
    await db.from("login_attempts").delete().eq("email", email);
  } catch {
    // intentionally silent
  }
}
