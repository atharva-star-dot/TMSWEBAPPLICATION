"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Company } from "@/lib/types";

export default function CompanyForm({ company }: { company: Company }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    name: company.name || "",
    gst_no: company.gst_no || "",
    address: company.address || "",
    phone: company.phone || "",
    email: company.email || "",
    pan_number: company.pan_number || "",
    bill_prefix: company.bill_prefix || "",
    logo_url: company.logo_url || "",
    tagline: company.tagline || "",
    bank_name: company.bank_name || "",
    account_number: company.account_number || "",
    ifsc_code: company.ifsc_code || "",
    sac_code: company.sac_code || "996791",
    pdf_accent_color: company.pdf_accent_color || "#1e3a5c",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${company.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("companies").update(form).eq("id", company.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Saved!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 max-w-2xl">
      {message && <p className="text-success text-sm">{message}</p>}
      <div>
        <label className="label">Company Name *</label>
        <input
          required
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">GST No</label>
        <input
          className="input"
          value={form.gst_no}
          onChange={(e) => setForm({ ...form, gst_no: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Tagline (shown under company name on invoices)</label>
        <input
          className="input"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          placeholder="e.g. Specialist in Container Handling"
        />
      </div>
      <div>
        <label className="label">Address</label>
        <input
          className="input"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Phone</label>
        <input
          className="input"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          className="input"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="label">PAN Number</label>
        <input
          className="input"
          value={form.pan_number}
          onChange={(e) => setForm({ ...form, pan_number: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Bill Prefix (e.g. PCM)</label>
        <input
          className="input"
          value={form.bill_prefix}
          onChange={(e) => setForm({ ...form, bill_prefix: e.target.value.toUpperCase() })}
        />
      </div>

      <h2 className="section-title mt-2">Bank Details (shown on invoice header)</h2>
      <div>
        <label className="label">Bank Name</label>
        <input
          className="input"
          value={form.bank_name}
          onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          placeholder="e.g. HDFC"
        />
      </div>
      <div>
        <label className="label">Account Number</label>
        <input
          className="input"
          value={form.account_number}
          onChange={(e) => setForm({ ...form, account_number: e.target.value })}
        />
      </div>
      <div>
        <label className="label">IFSC Code</label>
        <input
          className="input"
          value={form.ifsc_code}
          onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
        />
      </div>

      <h2 className="section-title mt-2">Invoice PDF Appearance</h2>
      <div>
        <label className="label">SAC Code</label>
        <input
          className="input"
          value={form.sac_code}
          onChange={(e) => setForm({ ...form, sac_code: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Table heading color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.pdf_accent_color}
            onChange={(e) => setForm({ ...form, pdf_accent_color: e.target.value })}
            className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent"
          />
          <input
            className="input"
            value={form.pdf_accent_color}
            onChange={(e) => setForm({ ...form, pdf_accent_color: e.target.value })}
          />
        </div>
        <p className="text-xs text-text-muted mt-1">
          Used as the background color of the invoice and GST report table headings.
        </p>
      </div>
      <div>
        <label className="label">Logo</label>
        <div className="flex items-center gap-3">
          {form.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded border border-border" />
          )}
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
          {uploading && <span className="text-text-muted text-sm">Uploading…</span>}
        </div>
      </div>
      <button className="btn btn-success w-fit" type="submit" disabled={saving}>
        {saving ? "Saving…" : "💾 Save Company"}
      </button>
    </form>
  );
}
