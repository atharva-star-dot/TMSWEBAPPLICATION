"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteBillButton({ id, billNumber }: { id: string; billNumber: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete bill ${billNumber}? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("bills").delete().eq("id", id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={busy} className="btn btn-danger text-xs px-3 py-1.5">
      🗑 Delete
    </button>
  );
}
