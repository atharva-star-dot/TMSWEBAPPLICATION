"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types matching fleet.json / /api/fleet shape ─────────────────────────── */
interface TruckPayment {
  party: string;
  amountInr: number;
  dueInDays: number;
}
interface Truck {
  id: number;
  regNo: string;
  driver: string;
  from: string;
  to: string;
  status: "on_trip" | "delayed" | "idle";
  progress: number;
  location: string;
  etaHours: number;
  checkInMinAgo: number;
  load: string;
  payment: TruckPayment | null;
  isSimulated: boolean;
}
interface Fleet {
  operator: string;
  simulated: boolean;
  trucks: Truck[];
}
interface VoiceResult {
  text: string;
  highlight: number | null;
  at: number;
}

const DEMO_TOKEN = "sarthiwala_demo_token_2026";

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const eta = (h: number) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const statusColor: Record<string, string> = {
  on_trip: "bg-green-500/20 text-green-400 border-green-500/30",
  delayed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  idle: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};
const statusLabel: Record<string, string> = {
  on_trip: "On Trip",
  delayed: "Delayed",
  idle: "Idle",
};

/* ── Main Client Component ────────────────────────────────────────────────── */
export function ControlRoomClient() {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);

  // Voice demo panel
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch(`/api/fleet?token=${DEMO_TOKEN}`);
      if (!res.ok) throw new Error(`Fleet API returned ${res.status}`);
      const data: Fleet = await res.json();
      setFleet(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 15000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  // Poll voice state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/voice/state");
        const data: VoiceResult = await res.json();
        if (data.at && (!voiceResult || data.at !== voiceResult.at)) {
          setVoiceResult(data);
          if (data.highlight) setSelectedTruck(data.highlight);
        }
      } catch {
        /* bridge offline */
      }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [voiceResult]);

  const callTool = async (tool: string, args: Record<string, unknown> = {}) => {
    setVoiceLoading(true);
    try {
      const res = await fetch("/api/voice/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args, token: DEMO_TOKEN }),
      });
      const data: VoiceResult = await res.json();
      setVoiceResult(data);
      if (data.highlight) setSelectedTruck(data.highlight);
    } catch {
      setVoiceResult({ text: "Voice request failed.", highlight: null, at: Date.now() });
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleVoiceSubmit = () => {
    const q = voiceQuery.trim().toLowerCase();
    if (!q) return;

    // Parse natural language to tool call
    if (q.match(/truck\s*(\d+)/i) || q.match(/where.*(\d+)/i)) {
      const match = q.match(/(\d+)/);
      callTool("truck_location", { truckId: Number(match?.[1] ?? 1) });
    } else if (q.includes("trip") || q.includes("status") || q.includes("fleet")) {
      callTool("trip_status");
    } else if (q.includes("payment") || q.includes("due") || q.includes("money")) {
      callTool("payments_due");
    } else if (q.includes("driver") || q.includes("check")) {
      const nameMatch = q.match(/(?:driver|checkin|check.in)\s+(.+)/i);
      callTool("driver_checkin", { driverName: nameMatch?.[1] ?? q });
    } else {
      // Default: try truck location with the query
      callTool("truck_location", { truckId: q });
    }
    setVoiceQuery("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Loading Fleet Data…</div>
      </div>
    );
  }

  if (error || !fleet) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="text-red-400 text-lg">{error || "No fleet data available."}</div>
      </div>
    );
  }

  const onTrip = fleet.trucks.filter((t) => t.status === "on_trip");
  const delayed = fleet.trucks.filter((t) => t.status === "delayed");
  const idle = fleet.trucks.filter((t) => t.status === "idle");
  const detail = fleet.trucks.find((t) => t.id === selectedTruck);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sarthiwala Control Room</h1>
          <p className="text-slate-400 text-sm">{fleet.operator}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
            DEMO — simulated telemetry
          </span>
          <span className="text-slate-500">{fleet.trucks.length} vehicles</span>
        </div>
      </header>

      {/* Stats bar */}
      <div className="px-6 py-3 flex gap-6 border-b border-slate-800/50 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-300">{onTrip.length} On Trip</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-300">{delayed.length} Delayed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-slate-300">{idle.length} Idle</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left: Truck list */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {fleet.trucks.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTruck(t.id === selectedTruck ? null : t.id)}
                className={`text-left rounded-lg border p-4 transition-all hover:border-blue-500/50 ${
                  t.id === selectedTruck
                    ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                    : t.id === voiceResult?.highlight
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60"
                }`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-sm">{t.regNo}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[t.status]}`}
                  >
                    {statusLabel[t.status]}
                  </span>
                </div>
                {/* Driver */}
                <div className="text-xs text-slate-400 mb-1">🚚 {t.driver}</div>
                {/* Route */}
                <div className="text-sm text-slate-200">
                  {t.from} → {t.to}
                </div>
                {/* Progress bar */}
                {t.status !== "idle" && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          t.status === "delayed" ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{t.progress}%</span>
                      <span>ETA {eta(t.etaHours)}</span>
                    </div>
                  </div>
                )}
                {/* Payment badge */}
                {t.payment && (
                  <div className="mt-2 text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        t.payment.dueInDays <= 0
                          ? "bg-red-500/20 text-red-400"
                          : t.payment.dueInDays <= 2
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-600/40 text-slate-400"
                      }`}
                    >
                      {inr(t.payment.amountInr)}{" "}
                      {t.payment.dueInDays <= 0
                        ? "due today"
                        : `due in ${t.payment.dueInDays}d`}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right panel: Detail + Voice */}
        <div className="w-full lg:w-96 border-l border-slate-800/50 p-6 space-y-6">
          {/* Detail panel */}
          {detail ? (
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
              <h3 className="text-lg font-bold mb-1">{detail.regNo}</h3>
              <div className="text-xs text-slate-500 mb-3">Truck #{detail.id}</div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Driver</dt>
                  <dd>{detail.driver}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Route</dt>
                  <dd>
                    {detail.from} → {detail.to}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Status</dt>
                  <dd>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor[detail.status]}`}>
                      {statusLabel[detail.status]}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Location</dt>
                  <dd className="text-right max-w-48">{detail.location}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Load</dt>
                  <dd className="text-right max-w-48">{detail.load}</dd>
                </div>
                {detail.status !== "idle" && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Progress</dt>
                      <dd>{detail.progress}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">ETA</dt>
                      <dd>{eta(detail.etaHours)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-400">Last Check-in</dt>
                  <dd>
                    {detail.checkInMinAgo < 60
                      ? `${detail.checkInMinAgo}m ago`
                      : `${Math.floor(detail.checkInMinAgo / 60)}h ago`}
                    {detail.checkInMinAgo > 120 && (
                      <span className="text-red-400 ml-1">⚠ overdue</span>
                    )}
                  </dd>
                </div>
                {detail.payment && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Payment</dt>
                      <dd>{inr(detail.payment.amountInr)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Due</dt>
                      <dd
                        className={
                          detail.payment.dueInDays <= 0
                            ? "text-red-400"
                            : detail.payment.dueInDays <= 2
                            ? "text-amber-400"
                            : ""
                        }
                      >
                        {detail.payment.dueInDays <= 0
                          ? "Today!"
                          : `${detail.payment.dueInDays} day${detail.payment.dueInDays === 1 ? "" : "s"}`}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {detail.isSimulated && (
                <div className="mt-3 text-xs text-slate-600 border-t border-slate-700/50 pt-2">
                  ℹ Location, progress, ETA, and check-in data are simulated.
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">
              Click a truck card to see details
            </div>
          )}

          {/* Voice demo panel */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
            <h3 className="text-sm font-bold text-slate-300 mb-3">
              🎙 Voice Demo Panel
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Try: &quot;where is truck 3&quot;, &quot;trip status&quot;, &quot;payments due&quot;, &quot;driver Ramesh&quot;
            </p>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={voiceQuery}
                onChange={(e) => setVoiceQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVoiceSubmit()}
                placeholder="Ask about your fleet…"
                className="flex-1 bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleVoiceSubmit}
                disabled={voiceLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded text-sm font-medium transition-colors"
              >
                {voiceLoading ? "…" : "Ask"}
              </button>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => callTool("trip_status")}
                className="text-xs px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 transition-colors"
              >
                Trip Status
              </button>
              <button
                onClick={() => callTool("payments_due")}
                className="text-xs px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 transition-colors"
              >
                Payments Due
              </button>
              {[1, 3, 5].map((id) => (
                <button
                  key={id}
                  onClick={() => callTool("truck_location", { truckId: id })}
                  className="text-xs px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 transition-colors"
                >
                  Truck {id}
                </button>
              ))}
            </div>

            {/* Response display */}
            {voiceResult && voiceResult.text && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm text-blue-200">
                {voiceResult.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-6 py-3 text-xs text-slate-600 text-center">
        Sarthiwala Control Room — Demo data only. All telemetry (location, progress, ETA, driver check-in) is simulated.
        Built with Next.js + Supabase.
      </footer>
    </div>
  );
}
