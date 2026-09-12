"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-server";

export async function signOut() {
  const supabase = createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
