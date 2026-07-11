export function computeTotalFreight(fields: {
  transport_charge: number;
  service_charges: number;
  parking_charges: number;
  hold_charges: number;
  pan_amount: number;
}) {
  const { transport_charge, service_charges, parking_charges, hold_charges, pan_amount } = fields;
  return (
    (Number(transport_charge) || 0) +
    (Number(service_charges) || 0) +
    (Number(parking_charges) || 0) +
    (Number(hold_charges) || 0) +
    (Number(pan_amount) || 0)
  );
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB");
}
