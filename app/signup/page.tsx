"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companyName, setCompanyName] = useState("");
  const [billPrefix, setBillPrefix] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);
      setError(signUpError?.message || "Could not create account.");
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_company_and_admin", {
      p_user_id: signUpData.user.id,
      p_username: username,
      p_company_name: companyName,
      p_bill_prefix: billPrefix || "INV",
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (signUpData.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setNotice("Account created! Check your email to confirm, then sign in.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-2xl p-3 mb-3">
            <Truck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text">Create your company account</h1>
          <p className="text-text-muted text-sm mt-1">
            Sets up a private workspace just for your team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {notice && (
            <div className="text-sm text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2">
              {notice}
            </div>
          )}

          <div>
            <label className="label">Company name *</label>
            <input
              required
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Pandurang Container Movers"
            />
          </div>

          <div>
            <label className="label">Bill prefix (e.g. PCM)</label>
            <input
              className="input"
              value={billPrefix}
              onChange={(e) => setBillPrefix(e.target.value.toUpperCase())}
              placeholder="PCM"
              maxLength={6}
            />
          </div>

          <div>
            <label className="label">Your name / username *</label>
            <input
              required
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin"
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="label">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <button disabled={loading} className="btn btn-primary w-full" type="submit">
            {loading ? "Creating account…" : "Create Account →"}
          </button>

          <p className="text-sm text-text-muted text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-brand font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
