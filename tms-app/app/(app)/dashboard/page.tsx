import { requireProfile } from "@/lib/session";
import StatCard from "@/components/StatCard";
import DashboardCharts from "@/components/DashboardCharts";
import { formatINR } from "@/lib/calc";
import { ClipboardList, Clock, CheckCircle2, Wallet, AlertTriangle } from "lucide-react";
import type { Bill } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();

  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("bill_date", { ascending: false });

  const all = (bills ?? []) as Bill[];

  const totalBills = all.length;
  const pending = all.filter((b) => b.bill_status === "Pending").length;
  const delivered = all.filter((b) => b.bill_status === "Delivered").length;
  const cancelled = all.filter((b) => b.bill_status === "Cancelled").length;
  const totalFreight = all.reduce((sum, b) => sum + Number(b.total_freight || 0), 0);
  const unpaid = all.filter((b) => b.payment_status === "Unpaid").length;

  // Monthly revenue — last 6 months
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
  }
  const monthly = months.map(({ key, label }) => {
    const [y, m] = key.split("-").map(Number);
    const revenue = all
      .filter((b) => {
        const d = new Date(b.bill_date);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((sum, b) => sum + Number(b.total_freight || 0), 0);
    return { month: label, revenue };
  });

  const statusTotal = pending + delivered + cancelled || 1;
  const statusDist = [
    { name: "Delivered", value: Math.round((delivered / statusTotal) * 100) },
    { name: "Pending", value: Math.round((pending / statusTotal) * 100) },
    { name: "Cancelled", value: Math.round((cancelled / statusTotal) * 100) },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">Dashboard</h1>
      <p className="text-text-muted mb-6">Welcome back, {profile.username}!</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Bills" value={totalBills} icon={ClipboardList} color="var(--brand)" />
        <StatCard label="Pending" value={pending} icon={Clock} color="var(--warning)" />
        <StatCard label="Delivered" value={delivered} icon={CheckCircle2} color="var(--success)" />
        <StatCard label="Total Freight" value={formatINR(totalFreight)} icon={Wallet} color="var(--brand)" />
        <StatCard label="Unpaid Bills" value={unpaid} icon={AlertTriangle} color="var(--danger)" />
      </div>

      <DashboardCharts monthly={monthly} statusDist={statusDist} />
    </div>
  );
}
