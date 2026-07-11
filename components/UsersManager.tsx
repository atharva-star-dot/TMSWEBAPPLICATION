"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

export default function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "staff" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not add user.");
      return;
    }
    setShowForm(false);
    setForm({ username: "", email: "", password: "", role: "staff" });
    router.refresh();
    location.reload();
  }

  async function handleDelete(u: Profile) {
    if (u.id === currentUserId) {
      alert("Cannot delete your own account or last admin.");
      return;
    }
    if (!confirm(`Delete user "${u.username}"?`)) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error);
      return;
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  }

  return (
    <div>
      <button className="btn btn-primary mb-5" onClick={() => setShowForm((s) => !s)}>
        + Add User
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {error && (
            <div className="md:col-span-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="label">Username *</label>
            <input
              required
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button className="btn btn-success" type="submit" disabled={busy}>
              {busy ? "Adding…" : "💾 Add User"}
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
              <th>Username</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td className="capitalize">{u.role}</td>
                <td>
                  <button className="btn btn-danger text-xs px-3 py-1.5" onClick={() => handleDelete(u)}>
                    🗑 Delete User
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted mt-3">⚠ Cannot delete your own account or the last admin.</p>
    </div>
  );
}
