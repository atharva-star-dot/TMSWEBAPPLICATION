import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { formatDate, formatINR } from "@/lib/calc";
import DeleteBillButton from "@/components/DeleteBillButton";

function paymentBadgeClass(status: string) {
  if (status === "Paid") return "badge-paid";
  if (status === "Partial") return "badge-partial";
  return "badge-unpaid";
}

function badgeClass(status: string) {
  if (status === "Delivered") return "badge-delivered";
  if (status === "Cancelled") return "badge-cancelled";
  return "badge-pending";
}

export default async function AllBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; minAmount?: string }>;
}) {
  const { status, minAmount } = await searchParams;
  const { supabase, profile } = await requireProfile();

  let query = supabase
    .from("bills")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("bill_date", { ascending: false });

  if (status && status !== "All") query = query.eq("bill_status", status);
  if (minAmount) query = query.gte("total_freight", Number(minAmount));

  const { data: bills } = await query;

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">All Bills</h1>
      <p className="text-text-muted mb-6">Manage and view all transport bills</p>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <Link href="/bills/new" className="btn btn-primary">
          + New Bill
        </Link>

        <form className="flex flex-wrap items-end gap-3" action="/bills">
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={status || "All"} className="input">
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Min Amount</label>
            <input name="minAmount" defaultValue={minAmount || ""} className="input w-32" type="number" />
          </div>
          <button className="btn btn-outline" type="submit">
            ▶ Filter
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Status</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(bills ?? []).map((b) => (
              <tr key={b.id}>
                <td>{b.bill_number}</td>
                <td>{b.driver_name}</td>
                <td>{b.vehicle_number}</td>
                <td>{b.route_particulars || `${b.from_location} → ${b.to_location}`}</td>
                <td>
                  <span className={`badge ${badgeClass(b.bill_status)}`}>{b.bill_status}</span>
                </td>
                <td>{formatDate(b.bill_date)}</td>
                <td>{formatINR(b.total_freight)}</td>
                <td>
                  <span className={`badge ${paymentBadgeClass(b.payment_status)}`}>
                    {b.payment_status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <Link href={`/bills/${b.id}`} className="btn btn-outline text-xs px-3 py-1.5">
                      👁 View
                    </Link>
                    <Link href={`/bills/${b.id}/edit`} className="btn btn-primary text-xs px-3 py-1.5">
                      ✏️ Edit
                    </Link>
                    <DeleteBillButton id={b.id} billNumber={b.bill_number} />
                  </div>
                </td>
              </tr>
            ))}
            {(!bills || bills.length === 0) && (
              <tr>
                <td colSpan={9} className="text-center text-text-muted py-8">
                  No bills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
