import { requireProfile } from "@/lib/session";
import { formatDate, formatINR } from "@/lib/calc";
import CopyReminderButton from "@/components/CopyReminderButton";
import type { Bill } from "@/lib/types";

export default async function RemindersPage() {
  const { supabase, profile } = await requireProfile();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data } = await supabase
    .from("bills")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("payment_status", "Unpaid")
    .lte("bill_date", sevenDaysAgo.toISOString().slice(0, 10))
    .order("bill_date");

  const bills = (data as Bill[]) ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">Payment Reminders</h1>
      <p className="text-text-muted mb-6">Unpaid bills older than 7 days</p>

      <p className="text-danger font-semibold mb-4">
        {bills.length} overdue unpaid bill(s) found
      </p>

      <div className="card overflow-x-auto mb-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Amount</th>
              <th>Bill Date</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>{b.bill_number}</td>
                <td>{b.driver_name}</td>
                <td>{b.route_particulars || `${b.from_location} → ${b.to_location}`}</td>
                <td>{formatINR(b.total_freight)}</td>
                <td>{formatDate(b.bill_date)}</td>
                <td>{formatDate(b.created_at)}</td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-text-muted py-8">
                  No overdue unpaid bills. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {bills.length > 0 && <CopyReminderButton bills={bills} />}
    </div>
  );
}
