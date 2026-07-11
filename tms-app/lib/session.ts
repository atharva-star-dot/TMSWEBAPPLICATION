import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, role, company_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login");

  return { supabase, user, profile };
}
