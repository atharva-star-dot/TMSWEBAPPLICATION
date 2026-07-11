"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AiSettingsForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: { provider: string; api_key: string; model: string; base_url: string } | null;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    provider: initial?.provider || "anthropic",
    api_key: initial?.api_key || "",
    model: initial?.model || "claude-sonnet-5",
    base_url: initial?.base_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("ai_settings")
      .upsert({ company_id: companyId, ...form }, { onConflict: "company_id" });
    setSaving(false);
    setMessage(error ? error.message : "Saved! Sarthiwala AI is ready to use.");
  }

  return (
    <form onSubmit={handleSave} className="card p-5 space-y-4 max-w-2xl">
      <h2 className="section-title">✨ Sarthiwala AI — Provider, API Key &amp; Model</h2>
      {message && <p className={message.includes("Saved") ? "text-success text-sm" : "text-danger text-sm"}>{message}</p>}

      <div>
        <label className="label">Provider</label>
        <select
          className="input"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="custom">Custom (OpenAI-compatible endpoint)</option>
        </select>
      </div>

      {form.provider === "custom" && (
        <div>
          <label className="label">Base URL</label>
          <input
            className="input"
            placeholder="https://your-provider.com/v1"
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="label">API Key</label>
        <input
          type="password"
          className="input"
          placeholder="sk-ant-…"
          value={form.api_key}
          onChange={(e) => setForm({ ...form, api_key: e.target.value })}
        />
        <p className="text-xs text-text-muted mt-1">
          This is your own key — never shared. Stored per company, used only for your Sarthiwala AI requests.
        </p>
      </div>

      <div>
        <label className="label">Model</label>
        <input
          className="input"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="claude-sonnet-5"
        />
        <p className="text-xs text-text-muted mt-1">
          e.g. claude-sonnet-5, claude-fable-5, claude-opus-4-8, claude-haiku-4-5, or a custom provider's model name.
        </p>
      </div>

      <button className="btn btn-success" type="submit" disabled={saving}>
        {saving ? "Saving…" : "💾 Save & Connect"}
      </button>
    </form>
  );
}
