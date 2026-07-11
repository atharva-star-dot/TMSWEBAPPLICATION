import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import BillForm from "@/components/BillForm";

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const [{ data: bill }, { data: customers }] = await Promise.all([
    supabase.from("bills").select("*").eq("id", id).eq("company_id", profile.company_id).single(),
    supabase.from("customers").select("*").eq("company_id", profile.company_id).order("name"),
  ]);

  if (!bill) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-text">Edit Bill — {bill.bill_number}</h1>
      <p className="text-text-muted mb-6">Update this transport bill</p>
      <BillForm mode="edit" companyId={profile.company_id} customers={customers ?? []} initial={bill} />
    </div>
  );
}
