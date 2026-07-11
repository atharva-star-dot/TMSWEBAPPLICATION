import { requireProfile } from "@/lib/session";
import BillForm from "@/components/BillForm";

export default async function NewBillPage() {
  const { supabase, profile } = await requireProfile();

  const [{ data: nextNumber }, { data: customers }] = await Promise.all([
    supabase.rpc("next_bill_number", { p_company_id: profile.company_id }),
    supabase.from("customers").select("*").eq("company_id", profile.company_id).order("name"),
  ]);

  const initial = {
    bill_number: (nextNumber as string) || "",
    bill_date: new Date().toISOString().slice(0, 10),
    bill_status: "Pending" as const,
    payment_status: "Unpaid" as const,
    transport_charge: 0,
    service_charges: 0,
    parking_charges: 0,
    hold_charges: 0,
    pan_amount: 0,
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-text">New Bill</h1>
      <p className="text-text-muted mb-6">Create a new transport bill</p>
      <BillForm
        mode="create"
        companyId={profile.company_id}
        customers={customers ?? []}
        initial={initial}
      />
    </div>
  );
}
