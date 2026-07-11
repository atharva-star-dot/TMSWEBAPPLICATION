"use client";

import { useRouter } from "next/navigation";
import { formatDate, formatINR } from "@/lib/calc";
import type { Bill, Company } from "@/lib/types";

export default function BillDetailActions({ bill, company }: { bill: Bill; company: Company }) {
  const router = useRouter();

  async function exportPdf() {
    const { generateInvoicePdf } = await import("@/lib/pdf/invoicePdf");
    await generateInvoicePdf(bill, company);
  }

  async function exportSimplePdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(16);
    doc.text(company.name || "Company", 14, y);
    y += 6;
    doc.setFontSize(10);
    if (company.address) {
      doc.text(company.address, 14, y);
      y += 5;
    }
    if (company.gst_no) {
      doc.text(`GST: ${company.gst_no}`, 14, y);
      y += 5;
    }
    y += 4;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFontSize(13);
    doc.text(`Invoice No: ${bill.bill_number}`, 14, y);
    y += 7;
    doc.setFontSize(10);

    const rows: [string, string | null | undefined][] = [
      ["Bill Date", formatDate(bill.bill_date)],
      ["Status", bill.bill_status],
      ["Payment Status", bill.payment_status],
      ["Driver Name", bill.driver_name],
      ["Vehicle Number", bill.vehicle_number],
      ["Container Number", bill.container_number],
      ["Client / Delivery Address", bill.client_address],
      ["From → To", `${bill.from_location ?? ""} -> ${bill.to_location ?? ""}`],
    ];

    rows.forEach(([label, value]) => {
      if (!value) return;
      const text = doc.splitTextToSize(`${label}: ${value}`, 180);
      doc.text(text, 14, y);
      y += 5 * text.length + 1;
    });

    y += 4;
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Total Freight: ${formatINR(bill.total_freight)}`, 14, y);

    doc.save(`${bill.bill_number}-simple.pdf`);
  }

  function whatsappShare() {
    const text = encodeURIComponent(
      `Invoice ${bill.bill_number}\nDate: ${formatDate(bill.bill_date)}\nRoute: ${bill.from_location} -> ${bill.to_location}\nAmount: ${formatINR(bill.total_freight)}\nStatus: ${bill.bill_status} / ${bill.payment_status}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-3 mt-6">
      <button className="btn btn-primary" onClick={exportPdf}>
        📄 Export Invoice PDF
      </button>
      <button className="btn btn-outline" onClick={exportSimplePdf}>
        🧾 Simple Bill
      </button>
      <button className="btn btn-outline" onClick={() => router.push(`/bills/${bill.id}/edit`)}>
        ✏️ Edit Bill
      </button>
      <button className="btn btn-success" onClick={whatsappShare}>
        💬 WhatsApp
      </button>
      <button className="btn btn-outline" onClick={() => router.push("/bills")}>
        ✕ Close
      </button>
    </div>
  );
}
