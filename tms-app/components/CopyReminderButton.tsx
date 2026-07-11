"use client";

import { useState } from "react";
import { formatDate, formatINR } from "@/lib/calc";
import type { Bill } from "@/lib/types";

export default function CopyReminderButton({ bills }: { bills: Bill[] }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const lines = bills.map(
      (b) =>
        `${b.bill_number} — ${b.driver_name} — ${b.route_particulars || `${b.from_location} → ${b.to_location}`} — ${formatINR(
          b.total_freight
        )} (Billed ${formatDate(b.bill_date)})`
    );
    const message = `Payment Reminder — ${bills.length} overdue unpaid bill(s):\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="btn btn-warning" onClick={handleCopy}>
      📋 {copied ? "Copied!" : "Copy Reminder Message"}
    </button>
  );
}
