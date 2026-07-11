"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeTotalFreight } from "@/lib/calc";
import { JOB_DESCRIPTIONS, type Bill, type Customer } from "@/lib/types";

type FormState = Partial<Bill> & {
  bill_number: string;
  bill_date: string;
};

export default function BillForm({
  mode,
  companyId,
  customers,
  initial,
}: {
  mode: "create" | "edit";
  companyId: string;
  customers: Customer[];
  initial: FormState;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalFreight = useMemo(
    () =>
      computeTotalFreight({
        transport_charge: Number(form.transport_charge) || 0,
        service_charges: Number(form.service_charges) || 0,
        parking_charges: Number(form.parking_charges) || 0,
        hold_charges: Number(form.hold_charges) || 0,
        pan_amount: Number(form.pan_amount) || 0,
      }),
    [form.transport_charge, form.service_charges, form.parking_charges, form.hold_charges, form.pan_amount]
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSelectCustomer(id: string) {
    set("customer_id", id || null);
    const c = customers.find((c) => c.id === id);
    if (c) {
      set("client_address", c.address || "");
      set("client_gst_no", c.gst_no || "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.driver_name || !form.vehicle_number || !form.container_number) {
      setError("Please fill all required fields (marked *).");
      return;
    }
    if (!form.client_address || !form.from_location || !form.to_location) {
      setError("Please fill all required fields (marked *).");
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      bill_number: form.bill_number,
      invoice_internal_no: form.invoice_internal_no || null,
      bill_date: form.bill_date,
      job_description: form.job_description || null,
      driver_name: form.driver_name,
      vehicle_number: form.vehicle_number,
      container_number: form.container_number,
      seal_number: form.seal_number || null,
      customer_id: form.customer_id || null,
      client_address: form.client_address,
      client_gst_no: form.client_gst_no || null,
      client_ref_invoice_no: form.client_ref_invoice_no || null,
      origin_address: form.origin_address || null,
      from_location: form.from_location,
      to_location: form.to_location,
      return_location: form.return_location || null,
      route_particulars: form.route_particulars || null,
      goods_description: form.goods_description || null,
      additional_notes: form.additional_notes || null,
      transport_charge: Number(form.transport_charge) || 0,
      charge_label: form.charge_label || null,
      service_charges: Number(form.service_charges) || 0,
      parking_charges: Number(form.parking_charges) || 0,
      hold_charges: Number(form.hold_charges) || 0,
      hold_description: form.hold_description || null,
      pan_amount: Number(form.pan_amount) || 0,
      pan_number: form.pan_number || null,
      total_freight: totalFreight,
      bill_status: form.bill_status || "Pending",
      payment_status: form.payment_status || "Unpaid",
    };

    if (mode === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("bills")
        .insert({ ...payload, created_by: user?.id ?? null });
      setSaving(false);
      if (error) return setError(error.message);
      router.push("/bills");
      router.refresh();
    } else {
      const { error } = await supabase.from("bills").update(payload).eq("id", initial.id);
      setSaving(false);
      if (error) return setError(error.message);
      router.push("/bills");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <section>
        <h2 className="section-title">Bill Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Bill Number *</label>
            <input className="input bg-surface-alt" value={form.bill_number} readOnly />
          </div>
          <div>
            <label className="label">Bill Date *</label>
            <input
              type="date"
              required
              className="input"
              value={form.bill_date}
              onChange={(e) => set("bill_date", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Invoice Internal No</label>
            <input
              className="input"
              value={form.invoice_internal_no || ""}
              onChange={(e) => set("invoice_internal_no", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Job Description</label>
            <select
              className="input"
              value={form.job_description || ""}
              onChange={(e) => set("job_description", e.target.value)}
            >
              <option value="">— Select —</option>
              {JOB_DESCRIPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Driver Name *</label>
            <input
              required
              className="input"
              value={form.driver_name || ""}
              onChange={(e) => set("driver_name", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Vehicle Number *</label>
            <input
              required
              className="input"
              value={form.vehicle_number || ""}
              onChange={(e) => set("vehicle_number", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Container Number *</label>
            <input
              required
              className="input"
              value={form.container_number || ""}
              onChange={(e) => set("container_number", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Seal Number</label>
            <input
              className="input"
              value={form.seal_number || ""}
              onChange={(e) => set("seal_number", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Client Details</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">Select Customer (optional — auto-fills address &amp; GST)</label>
            <select
              className="input"
              value={form.customer_id || ""}
              onChange={(e) => onSelectCustomer(e.target.value)}
            >
              <option value="">— None —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Client / Delivery Address *</label>
            <textarea
              required
              rows={2}
              className="input"
              value={form.client_address || ""}
              onChange={(e) => set("client_address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Client GST No</label>
              <input
                className="input"
                value={form.client_gst_no || ""}
                onChange={(e) => set("client_gst_no", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Client Ref Invoice No</label>
              <input
                className="input"
                value={form.client_ref_invoice_no || ""}
                onChange={(e) => set("client_ref_invoice_no", e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Shipping / Origin</h2>
        <div>
          <label className="label">Shipping / Origin Address *</label>
          <textarea
            required
            rows={2}
            className="input"
            value={form.origin_address || ""}
            onChange={(e) => set("origin_address", e.target.value)}
          />
        </div>
      </section>

      <section>
        <h2 className="section-title">Route &amp; Goods</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">From Location *</label>
            <input
              required
              className="input"
              value={form.from_location || ""}
              onChange={(e) => set("from_location", e.target.value)}
            />
          </div>
          <div>
            <label className="label">To Location *</label>
            <input
              required
              className="input"
              value={form.to_location || ""}
              onChange={(e) => set("to_location", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Return Location</label>
            <input
              className="input"
              value={form.return_location || ""}
              onChange={(e) => set("return_location", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Route / Particulars</label>
            <textarea
              rows={1}
              className="input"
              value={form.route_particulars || ""}
              onChange={(e) => set("route_particulars", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Goods Description</label>
            <input
              className="input"
              value={form.goods_description || ""}
              onChange={(e) => set("goods_description", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Additional Notes</label>
            <textarea
              rows={2}
              className="input"
              value={form.additional_notes || ""}
              onChange={(e) => set("additional_notes", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Charges Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Transport / Service Charge (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.transport_charge ?? ""}
              onChange={(e) => set("transport_charge", e.target.value as any)}
            />
          </div>
          <div>
            <label className="label">Charge Label</label>
            <input
              className="input"
              value={form.charge_label || ""}
              onChange={(e) => set("charge_label", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Service Charges (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.service_charges ?? ""}
              onChange={(e) => set("service_charges", e.target.value as any)}
            />
          </div>
          <div>
            <label className="label">Parking Charges (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.parking_charges ?? ""}
              onChange={(e) => set("parking_charges", e.target.value as any)}
            />
          </div>
          <div>
            <label className="label">Hold Charges (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.hold_charges ?? ""}
              onChange={(e) => set("hold_charges", e.target.value as any)}
            />
          </div>
          <div>
            <label className="label">Hold Description</label>
            <input
              className="input"
              value={form.hold_description || ""}
              onChange={(e) => set("hold_description", e.target.value)}
            />
          </div>
          <div>
            <label className="label">PAN Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.pan_amount ?? ""}
              onChange={(e) => set("pan_amount", e.target.value as any)}
            />
          </div>
          <div>
            <label className="label">PAN Number</label>
            <input
              className="input"
              value={form.pan_number || ""}
              onChange={(e) => set("pan_number", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between card px-4 py-3">
          <span className="text-text-muted">Total Freight Amount (₹) — Auto Computed</span>
          <span className="text-xl font-bold text-brand">
            {totalFreight.toLocaleString("en-IN")}
          </span>
        </div>
      </section>

      <section>
        <h2 className="section-title">Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Bill Status</label>
            <select
              className="input"
              value={form.bill_status || "Pending"}
              onChange={(e) => set("bill_status", e.target.value as Bill["bill_status"])}
            >
              <option>Pending</option>
              <option>Delivered</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Payment Status</label>
            <select
              className="input"
              value={form.payment_status || "Unpaid"}
              onChange={(e) => set("payment_status", e.target.value as Bill["payment_status"])}
            >
              <option>Unpaid</option>
              <option>Paid</option>
              <option>Partial</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button disabled={saving} type="submit" className="btn btn-success">
          {saving ? "Saving…" : "💾 Save Bill"}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => router.push("/bills")}>
          ✕ Cancel
        </button>
      </div>
    </form>
  );
}
