import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { formatDate, formatINR } from "@/lib/calc";
import BillDetailActions from "@/components/BillDetailActions";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/60 last:border-0 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-medium text-right">{value}</span>
    </div>
  );
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const [{ data: bill }, { data: company }] = await Promise.all([
    supabase.from("bills").select("*").eq("id", id).eq("company_id", profile.company_id).single(),
    supabase.from("companies").select("*").eq("id", profile.company_id).single(),
  ]);

  if (!bill || !company) notFound();

  const badgeClass =
    bill.bill_status === "Delivered"
      ? "badge-delivered"
      : bill.bill_status === "Cancelled"
      ? "badge-cancelled"
      : "badge-pending";

  return (
    <div className="max-w-3xl">
      <div className="card overflow-hidden">
        <div className="bg-brand text-white px-6 py-5">
          <h1 className="text-xl font-bold">Invoice No: {bill.bill_number}</h1>
          <p className="text-sm opacity-90 mt-1">
            Date: {formatDate(bill.bill_date)} &nbsp;•&nbsp;{" "}
            <span className={`badge ${badgeClass} align-middle`}>{bill.bill_status}</span>
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="section-title">Bill Information</h2>
            <Row label="Invoice Internal No" value={bill.invoice_internal_no} />
            <Row label="Job Description" value={bill.job_description} />
            <Row label="Driver Name" value={bill.driver_name} />
            <Row label="Vehicle Number" value={bill.vehicle_number} />
            <Row label="Container Number" value={bill.container_number} />
            <Row label="Seal Number" value={bill.seal_number} />
            <Row label="Payment Status" value={bill.payment_status} />
          </div>

          <div>
            <h2 className="section-title">Client Details</h2>
            <Row label="Client / Delivery Address" value={bill.client_address} />
            <Row label="Client GST No" value={bill.client_gst_no} />
            <Row label="Client Ref Invoice No" value={bill.client_ref_invoice_no} />
          </div>

          <div>
            <h2 className="section-title">Shipping</h2>
            <Row label="Shipping / Origin Address" value={bill.origin_address} />
          </div>

          <div>
            <h2 className="section-title">Route</h2>
            <Row label="From → To" value={`${bill.from_location ?? ""} → ${bill.to_location ?? ""}`} />
            <Row label="Return Location" value={bill.return_location} />
            <Row label="Route / Particulars" value={bill.route_particulars} />
            <Row label="Goods Description" value={bill.goods_description} />
            <Row label="Additional Notes" value={bill.additional_notes} />
          </div>

          <div>
            <h2 className="section-title">Charges</h2>
            <Row label="Transport / Service Charge" value={formatINR(bill.transport_charge)} />
            <Row label={bill.charge_label || "Charge Label"} value={bill.charge_label ? formatINR(bill.transport_charge) : undefined} />
            <Row label="Service Charges" value={formatINR(bill.service_charges)} />
            <Row label="Parking Charges" value={formatINR(bill.parking_charges)} />
            <Row label="Hold Charges" value={bill.hold_charges ? formatINR(bill.hold_charges) : undefined} />
            <Row label="Hold Description" value={bill.hold_description} />
            <Row label="PAN Amount" value={bill.pan_amount ? formatINR(bill.pan_amount) : undefined} />
            <Row label="PAN Number" value={bill.pan_number} />
            <div className="flex justify-between pt-3 mt-2 border-t border-border font-bold">
              <span>Total Freight Amount</span>
              <span className="text-brand">{formatINR(bill.total_freight)}</span>
            </div>
          </div>
        </div>
      </div>

      <BillDetailActions bill={bill} company={company} />
    </div>
  );
}
