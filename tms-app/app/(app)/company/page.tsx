import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import CompanyForm from "@/components/CompanyForm";
import AiSettingsForm from "@/components/AiSettingsForm";

export default async function CompanyPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const [{ data: company }, { data: aiSettings }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", profile.company_id).single(),
    supabase.from("ai_settings").select("*").eq("company_id", profile.company_id).maybeSingle(),
  ]);

  if (!company) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text">Company Settings</h1>
        <p className="text-text-muted mb-6">Update your company profile</p>
        <CompanyForm company={company} />
      </div>

      <AiSettingsForm companyId={profile.company_id} initial={aiSettings} />
    </div>
  );
}
