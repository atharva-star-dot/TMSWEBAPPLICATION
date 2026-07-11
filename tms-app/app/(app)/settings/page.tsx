"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Password updated.");
    setPassword("");
  }

  return (
    <div className="max-w-md">
      <h1 className="text-3xl font-bold text-text">Settings</h1>
      <p className="text-text-muted mb-6">Manage your account</p>

      <form onSubmit={handleChangePassword} className="card p-5 space-y-4">
        <h2 className="section-title">Change Password</h2>
        {error && <p className="text-danger text-sm">{error}</p>}
        {message && <p className="text-success text-sm">{message}</p>}
        <div>
          <label className="label">New Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
