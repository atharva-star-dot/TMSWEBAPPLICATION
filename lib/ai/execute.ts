import type { SupabaseClient } from "@supabase/supabase-js";

export async function executeTool(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  name: string,
  input: any
): Promise<any> {
  try {
    switch (name) {
      case "search_bills": {
        let q = supabase.from("bills").select("*").eq("company_id", companyId);
        if (input.status && input.status !== "All Status") q = q.eq("bill_status", input.status);
        if (input.min_amount) q = q.gte("total_freight", Number(input.min_amount));
        if (input.query) {
          const term = `%${input.query}%`;
          q = q.or(
            `bill_number.ilike.${term},driver_name.ilike.${term},vehicle_number.ilike.${term},container_number.ilike.${term},from_location.ilike.${term},to_location.ilike.${term}`
          );
        }
        const { data, error } = await q.order("bill_date", { ascending: false }).limit(15);
        if (error) return { error: error.message };
        return { count: data?.length ?? 0, showing: data?.length ?? 0, bills: data };
      }

      case "get_bill": {
        const { data, error } = await supabase
          .from("bills")
          .select("*")
          .eq("company_id", companyId)
          .ilike("bill_number", input.bill_number)
          .single();
        if (error || !data) return { error: "No bill found with that number." };
        return data;
      }

      case "update_bill_status": {
        const { data: bill } = await supabase
          .from("bills")
          .select("id")
          .eq("company_id", companyId)
          .ilike("bill_number", input.bill_number)
          .single();
        if (!bill) return { error: "No bill found with that number." };
        const { error } = await supabase
          .from("bills")
          .update({ bill_status: input.status })
          .eq("id", bill.id);
        if (error) return { error: error.message };
        return { success: true };
      }

      case "update_payment_status": {
        const { data: bill } = await supabase
          .from("bills")
          .select("id")
          .eq("company_id", companyId)
          .ilike("bill_number", input.bill_number)
          .single();
        if (!bill) return { error: "No bill found with that number." };
        const { error } = await supabase
          .from("bills")
          .update({ payment_status: input.payment_status })
          .eq("id", bill.id);
        if (error) return { error: error.message };
        return { success: true };
      }

      case "delete_bill": {
        const { data: bill } = await supabase
          .from("bills")
          .select("id")
          .eq("company_id", companyId)
          .ilike("bill_number", input.bill_number)
          .single();
        if (!bill) return { error: "No bill found with that number." };
        const { error } = await supabase.from("bills").delete().eq("id", bill.id);
        if (error) return { error: error.message };
        return { success: true };
      }

      case "create_simple_bill": {
        const { data: nextNumber } = await supabase.rpc("next_bill_number", {
          p_company_id: companyId,
        });
        const payload = {
          company_id: companyId,
          bill_number: nextNumber as string,
          bill_date: new Date().toISOString().slice(0, 10),
          job_description: "Export / Import Container",
          driver_name: input.driver_name || "",
          vehicle_number: input.vehicle_number || "",
          container_number: input.container_number || "",
          route_particulars: input.route || "",
          from_location: input.from_location || "",
          to_location: input.to_location || "",
          client_address: input.route || "Created via Sarthiwala AI",
          origin_address: input.from_location || "Created via Sarthiwala AI",
          transport_charge: Number(input.freight_amount) || 0,
          total_freight: Number(input.freight_amount) || 0,
          additional_notes: "Created via Sarthiwala AI",
          bill_status: "Pending",
          payment_status: "Unpaid",
          created_by: userId,
        };
        const { error } = await supabase.from("bills").insert(payload);
        if (error) return { error: error.message };
        return { success: true, bill_number: nextNumber };
      }

      case "list_customers": {
        let q = supabase.from("customers").select("*").eq("company_id", companyId);
        if (input.query) q = q.ilike("name", `%${input.query}%`);
        const { data, error } = await q.order("name").limit(15);
        if (error) return { error: error.message };
        return { count: data?.length ?? 0, customers: data };
      }

      case "add_customer": {
        const { error } = await supabase.from("customers").insert({
          company_id: companyId,
          name: input.name,
          gst_no: input.gst_no || null,
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
        });
        if (error) return { error: error.message };
        return { success: true };
      }

      case "get_dashboard_summary": {
        const { data: bills, error } = await supabase
          .from("bills")
          .select("bill_status, payment_status, total_freight, bill_date")
          .eq("company_id", companyId);
        if (error) return { error: error.message };
        const total = bills?.length ?? 0;
        const pending = (bills ?? []).filter((b) => b.bill_status === "Pending").length;
        const unpaid = (bills ?? []).filter((b) => b.payment_status === "Unpaid").length;
        const revenue = (bills ?? [])
          .filter((b) => b.bill_status !== "Cancelled")
          .reduce((s, b) => s + Number(b.total_freight || 0), 0);
        return { total_bills: total, pending_bills: pending, unpaid_bills: unpaid, total_revenue: revenue };
      }

      default:
        return { error: `Unknown tool '${name}'.` };
    }
  } catch (e: any) {
    return { error: e.message || String(e) };
  }
}
