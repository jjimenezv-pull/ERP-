"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-server";

export async function sendMagicLink(email: string) {
  const supabase = createSessionClient();
  const origin = headers().get("origin");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/casos");
}
