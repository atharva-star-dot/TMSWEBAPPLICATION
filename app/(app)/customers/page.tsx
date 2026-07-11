"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";

const empty = { name: "", gst_no: "", address: "", phone: "", email: "" };

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [companyId, setCompanyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (!profile) return;
    setCompanyId(profile.company_id);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name");
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      gst_no: c.gst_no || "",
      address: c.address || "",
      phone: c.phone || "",
      email: c.email || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    if (editing) {
      await supabase.from("customers").update(form).eq("id", editing.id);
    } else {
      await supabase.from("customers").insert({ ...form, company_id: companyId });
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    await supabase.from("customers").delete().eq("id", c.id);
    load();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">Customers</h1>
      <p className="text-text-muted mb-6">Manage customer records</p>

      <button className="btn btn-primary mb-5" onClick={openAdd}>
        + Add Customer
      </button>

      {showForm && (
        <form onSubmit={handleSave} className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name *</label>
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
          <div className="md:col-span-2">
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
          <div className="md:col-span-2 flex gap-3">
            <button className="btn btn-success" type="submit">
              💾 Save Customer
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>GST No</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.gst_no}</td>
                <td>{c.address}</td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-primary text-xs px-3 py-1.5" onClick={() => openEdit(c)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-danger text-xs px-3 py-1.5" onClick={() => handleDelete(c)}>
                      🗑 Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-text-muted py-8">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
