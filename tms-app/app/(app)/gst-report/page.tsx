"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatINR } from "@/lib/calc";
import type { Bill, Company } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function GstReportPage() {
  const supabase = createClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${endDate}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single();

    const [{ data: billData }, { data: companyData }] = await Promise.all([
      supabase
        .from("bills")
        .select("*")
        .eq("company_id", profile!.company_id)
        .gte("bill_date", start)
        .lte("bill_date", end)
        .order("bill_date"),
      supabase.from("companies").select("*").eq("id", profile!.company_id).single(),
    ]);

    setBills((billData as Bill[]) ?? []);
    setCompany(companyData as Company);
    setLoading(false);
  }

  const totalFreight = (bills ?? []).reduce((s, b) => s + Number(b.total_freight || 0), 0);
  const totalGst = totalFreight * 0.05;

  async function exportPdf() {
    if (!bills || !company) return;
    const { generateGstReportPdf } = await import("@/lib/pdf/gstReportPdf");
    await generateGstReportPdf(bills, company, month, year);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">GST Report</h1>
      <p className="text-text-muted mb-6">Monthly GST summary for all bills</p>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="label">Select Month</label>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <input
            type="number"
            className="input w-28"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          ▶ {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {bills && (
        <>
          <h2 className="text-xl font-semibold mb-3 text-text">
            GST Report — {MONTHS[month - 1]} {year}
          </h2>
          <div className="card overflow-x-auto mb-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Client GST</th>
                  <th>Amount</th>
                  <th>GST Type</th>
                  <th>Total GST</th>
                  <th>CGST (2.5%)</th>
                  <th>SGST (2.5%)</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const gst = Number(b.total_freight) * 0.05;
                  return (
                    <tr key={b.id}>
                      <td>{b.bill_number}</td>
                      <td>{formatDate(b.bill_date)}</td>
                      <td>{b.client_gst_no || "—"}</td>
                      <td>{formatINR(b.total_freight)}</td>
                      <td>RCM</td>
                      <td>{formatINR(gst)}</td>
                      <td>{formatINR(gst / 2)}</td>
                      <td>{formatINR(gst / 2)}</td>
                    </tr>
                  );
                })}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-text-muted py-8">
                      No bills in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-success font-semibold mb-4">
            Total Freight: {formatINR(totalFreight)} &nbsp;|&nbsp; Total GST: {formatINR(totalGst)} &nbsp;|&nbsp;
            CGST: {formatINR(totalGst / 2)} &nbsp;|&nbsp; SGST: {formatINR(totalGst / 2)}
          </p>

          <button className="btn btn-primary" onClick={exportPdf} disabled={bills.length === 0}>
            📄 Export GST Report PDF
          </button>
        </>
      )}
    </div>
  );
}
