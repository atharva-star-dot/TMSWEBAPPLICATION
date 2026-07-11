import { hexToRgb, urlToDataUrl } from "./colors";
import { amountInWordsRupees } from "@/lib/numberToWords";
import { formatDate } from "@/lib/calc";
import type { Bill, Company } from "@/lib/types";

export async function generateInvoicePdf(bill: Bill, company: Company) {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = (autoTableModule as any).default || (autoTableModule as any);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const accent = hexToRgb(company.pdf_accent_color || "#1e3a5c");

  // Outer border for the whole invoice
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  doc.rect(margin, margin, contentWidth, 277 - margin * 2 - 5);

  let y = margin + 8;
  const left = margin + 4;

  // Logo
  let logoWidth = 0;
  if (company.logo_url) {
    const dataUrl = await urlToDataUrl(company.logo_url);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "PNG", left, y - 4, 18, 18);
        logoWidth = 22;
      } catch {
        // unsupported image format — skip silently
      }
    }
  }

  const textLeft = left + logoWidth;

  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(company.name || "Company Name", textLeft, y);
  y += 5.5;

  doc.setTextColor(30, 30, 30);
  if (company.tagline) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(company.tagline.toUpperCase(), textLeft, y);
    y += 4.5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const addrLine = [company.address, company.email && `Email: ${company.email}`].filter(Boolean).join("   |   ");
  if (addrLine) {
    doc.text(addrLine, textLeft, y);
    y += 4;
  }
  const bankLine = [
    company.gst_no && `GST No: ${company.gst_no}`,
    company.bank_name && `Bank: ${company.bank_name}`,
    company.account_number && `A/C: ${company.account_number}`,
  ]
    .filter(Boolean)
    .join("   |   ");
  if (bankLine) {
    doc.text(bankLine, textLeft, y);
    y += 4;
  }
  const contactLine = [
    company.ifsc_code && `IFSC: ${company.ifsc_code}`,
    company.phone && `Cont: ${company.phone}`,
  ]
    .filter(Boolean)
    .join("   |   ");
  if (contactLine) {
    doc.text(contactLine, textLeft, y);
    y += 4;
  }

  y = Math.max(y, margin + 8 + 18) + 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin + 1, y, margin + contentWidth - 1, y);
  y += 6;

  // Two-column block: client/route info (left) vs invoice meta (right)
  const rightColX = margin + contentWidth - 60;
  const blockTopY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("To,", left, y);
  y += 4.2;
  doc.text(`M/s. ${bill.client_address?.split("\n")[0] || "—"}`, left, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const infoLines = [
    bill.job_description,
    bill.route_particulars || (bill.from_location && `${bill.from_location} → ${bill.to_location}`),
    bill.return_location && `Return Location: ${bill.return_location}`,
    bill.container_number && `Container Number: ${bill.container_number}`,
    bill.seal_number && `Seal Number: ${bill.seal_number}`,
    bill.vehicle_number && `Vehicle Number: ${bill.vehicle_number}`,
  ].filter(Boolean) as string[];

  infoLines.forEach((line) => {
    doc.text(String(line), left, y);
    y += 4.2;
  });

  // Right column — invoice metadata
  let ry = blockTopY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Internal No: ${bill.invoice_internal_no || "—"}`, rightColX, ry, { align: "left" });
  ry += 5;
  doc.setFontSize(10.5);
  doc.text(`Invoice No: ${bill.bill_number}`, rightColX, ry);
  ry += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Invoice Date: ${formatDate(bill.bill_date)}`, rightColX, ry);
  ry += 5;
  if (company.sac_code) {
    doc.text(`SAC Code: ${company.sac_code}`, rightColX, ry);
    ry += 5;
  }

  y = Math.max(y, ry) + 3;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin + 1, y, margin + contentWidth - 1, y);
  y += 4;

  // Charges table
  const rows: [string, string, string, string][] = [];
  rows.push([
    formatDate(bill.bill_date),
    bill.charge_label || "Transport Charges",
    "",
    Number(bill.transport_charge || 0).toLocaleString("en-IN"),
  ]);
  if (Number(bill.hold_charges) > 0) {
    rows.push(["", bill.hold_description || "Hold Charges", "", Number(bill.hold_charges).toLocaleString("en-IN")]);
  }
  if (Number(bill.service_charges) > 0) {
    rows.push(["", "Service Charges", "", Number(bill.service_charges).toLocaleString("en-IN")]);
  }
  if (Number(bill.parking_charges) > 0) {
    rows.push(["", "Parking Charges", "", Number(bill.parking_charges).toLocaleString("en-IN")]);
  }
  if (Number(bill.pan_amount) > 0) {
    rows.push(["", `Pan${bill.pan_number ? "-" + bill.pan_number : ""}`, "", Number(bill.pan_amount).toLocaleString("en-IN")]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin + 1, right: margin + 1 },
    head: [["DATE", "PARTICULARS", "RATE", "AMOUNT"]],
    body: rows.map((r) => [r[0], r[1], r[3], r[3]]),
    columns: [{ dataKey: 0 }, { dataKey: 1 }, { dataKey: 2 }, { dataKey: 3 }],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.2 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
    },
    didParseCell: (data: any) => {
      // Hide the duplicate "rate" column value except conceptually — original
      // shows rate == amount for single-line-item rows, so keep both filled.
      if (data.section === "body" && data.column.index === 2) {
        // rate column already holds the numeric value from the map above
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 2;

  // Total row
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  doc.rect(margin + 1, finalY, contentWidth - 2, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(amountInWordsRupees(bill.total_freight), margin + 3, finalY + 5);
  doc.setFontSize(9);
  doc.text("Total", margin + contentWidth - 55, finalY + 5);
  doc.text(Number(bill.total_freight).toLocaleString("en-IN"), margin + contentWidth - 3, finalY + 5, {
    align: "right",
  });
  finalY += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("E&OE", left, finalY);
  finalY += 22;

  // Signature lines
  const sigY = finalY;
  const col1 = left;
  const col2 = margin + contentWidth / 2 - 20;
  const col3 = margin + contentWidth - 55;

  doc.setDrawColor(60, 60, 60);
  doc.line(col1, sigY, col1 + 45, sigY);
  doc.line(col2, sigY, col2 + 45, sigY);
  doc.line(col3, sigY, col3 + 45, sigY);

  doc.setFontSize(8);
  doc.text("Prepared By:", col1, sigY + 4);
  doc.text("Checked By:", col2, sigY + 4);
  doc.setFont("helvetica", "bold");
  doc.text(`For ${company.name || "Company"}`, col3, sigY + 4);
  doc.setFont("helvetica", "normal");
  doc.text("Authorized Signatory", col3, sigY + 9);

  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Page 1 of 1", pageWidth / 2, 290, { align: "center" });

  doc.save(`Invoice_${bill.bill_number}.pdf`);
}
