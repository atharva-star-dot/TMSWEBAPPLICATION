import { requireProfile } from "@/lib/session";
import SarthiwalaAI from "@/components/SarthiwalaAI";

export default async function SarthiwalaAIPage() {
  const { supabase, profile } = await requireProfile();

  const { data: aiSettings } = await supabase
    .from("ai_settings")
    .select("api_key")
    .eq("company_id", profile.company_id)
    .maybeSingle();

  const needsKeySetup = !aiSettings?.api_key;

  return <SarthiwalaAI needsKeySetup={needsKeySetup} />;
}
