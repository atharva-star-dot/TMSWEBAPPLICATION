import { hexToRgb } from "./colors";
import { formatDate, formatINR } from "@/lib/calc";
import type { Bill, Company } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function generateGstReportPdf(
  bills: Bill[],
  company: Company,
  month: number,
  year: number
) {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = (autoTableModule as any).default || (autoTableModule as any);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 10;
  const pageWidth = 210;
  const accent = hexToRgb(company.pdf_accent_color || "#1e3a5c");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(`${company.name || "Company"} — GST Report`, margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Period: ${MONTHS[month - 1]} ${year}`, margin, 22);

  let totalFreight = 0;
  let totalGst = 0;

  const rows = bills.map((b) => {
    const amount = Number(b.total_freight || 0);
    const gst = amount * 0.05;
    const half = gst / 2;
    totalFreight += amount;
    totalGst += gst;
    return [
      b.bill_number,
      formatDate(b.bill_date),
      b.client_gst_no || "—",
      amount.toLocaleString("en-IN"),
      "RCM",
      gst.toFixed(2),
      half.toFixed(2),
      half.toFixed(2),
    ];
  });

  autoTable(doc, {
    startY: 28,
    margin: { left: margin, right: margin },
    head: [["Bill No", "Date", "Client GST", "Amount", "GST Type", "Total GST", "CGST (2.5%)", "SGST (2.5%)"]],
    body: rows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [190, 190, 190], lineWidth: 0.2 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: {
      3: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Total Freight: ${formatINR(totalFreight)}   |   Total GST: ${formatINR(totalGst)}   |   CGST: ${formatINR(
      totalGst / 2
    )}   |   SGST: ${formatINR(totalGst / 2)}`,
    margin,
    finalY
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Page 1 of 1", pageWidth / 2, 290, { align: "center" });

  doc.save(`GST-Report-${MONTHS[month - 1]}-${year}.pdf`);
}
