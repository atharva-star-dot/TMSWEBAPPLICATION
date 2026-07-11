import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import UsersManager from "@/components/UsersManager";

export default async function UsersPage() {
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "admin") redirect("/dashboard");

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("username");

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">User Management</h1>
      <p className="text-text-muted mb-6">Add, view, and delete system users</p>
      <UsersManager initialUsers={users ?? []} currentUserId={profile.id} />
    </div>
  );
}
