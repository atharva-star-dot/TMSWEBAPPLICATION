export type BillStatus = "Pending" | "Delivered" | "Cancelled";
export type PaymentStatus = "Paid" | "Unpaid" | "Partial";
export type Role = "admin" | "staff";

export interface Company {
  id: string;
  name: string;
  gst_no: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  pan_number: string | null;
  bill_prefix: string;
  logo_url: string | null;
  tagline: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  sac_code: string | null;
  pdf_accent_color: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  username: string;
  role: Role;
  created_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  gst_no: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  company_id: string;
  bill_number: string;
  invoice_internal_no: string | null;
  bill_date: string;
  job_description: string | null;
  driver_name: string | null;
  vehicle_number: string | null;
  container_number: string | null;
  seal_number: string | null;

  customer_id: string | null;
  client_address: string | null;
  client_gst_no: string | null;
  client_ref_invoice_no: string | null;

  origin_address: string | null;
  from_location: string | null;
  to_location: string | null;
  return_location: string | null;
  route_particulars: string | null;
  goods_description: string | null;
  additional_notes: string | null;

  transport_charge: number;
  charge_label: string | null;
  service_charges: number;
  parking_charges: number;
  hold_charges: number;
  hold_description: string | null;
  pan_amount: number;
  pan_number: string | null;
  total_freight: number;

  bill_status: BillStatus;
  payment_status: PaymentStatus;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const JOB_DESCRIPTIONS = [
  "Export Container",
  "Import Container",
  "Empty Container",
  "Domestic Transport",
  "Other",
];
