import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, company_id, companies ( name )")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // signup RPC hasn't finished / profile missing — send back to login
    redirect("/login");
  }

  const companyName = (profile as any).companies?.name ?? "";

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar companyName={companyName} username={profile.username} role={profile.role} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">{children}</main>
    </div>
  );
}
