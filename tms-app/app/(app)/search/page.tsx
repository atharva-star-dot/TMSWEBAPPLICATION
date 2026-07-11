"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatINR } from "@/lib/calc";
import type { Bill } from "@/lib/types";

export default function SearchPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Bill[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const term = `%${query.trim()}%`;
    const { data } = await supabase
      .from("bills")
      .select("*")
      .or(
        `bill_number.ilike.${term},driver_name.ilike.${term},container_number.ilike.${term},vehicle_number.ilike.${term},from_location.ilike.${term},to_location.ilike.${term},route_particulars.ilike.${term}`
      )
      .order("bill_date", { ascending: false });
    setResults((data as Bill[]) ?? []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">Search Bills</h1>
      <p className="text-text-muted mb-6">Search by driver, bill number, route, or container</p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          className="input"
          placeholder="Type to search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary" disabled={loading}>
          🔍 {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {results && (
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
              </tr>
            </thead>
            <tbody>
              {results.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bills/${b.id}`} className="text-brand font-medium">
                      {b.bill_number}
                    </Link>
                  </td>
                  <td>{b.driver_name}</td>
                  <td>{b.vehicle_number}</td>
                  <td>
                    {b.route_particulars || `${b.from_location} → ${b.to_location}`}
                  </td>
                  <td>{b.bill_status}</td>
                  <td>{formatDate(b.bill_date)}</td>
                  <td>{formatINR(b.total_freight)}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-text-muted py-8">
                    No matching bills.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
