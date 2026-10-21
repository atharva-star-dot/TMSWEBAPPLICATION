import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FLEET = join(dirname(fileURLToPath(import.meta.url)), "..", "shared", "fleet.json");
export const loadFleet = () => JSON.parse(readFileSync(FLEET, "utf8")).trucks;

const hrs = (h) => { const m = Math.round(h * 60); return m < 60 ? `${m} minutes` : `${Math.floor(m / 60)} hours ${m % 60} minutes`; };
const inr = (n) => `₹${n.toLocaleString("en-IN")}`;
const ago = (m) => (m < 60 ? `${m} minutes ago` : `${Math.floor(m / 60)} hours ago`);
const find = (id) => loadFleet().find((t) => t.id === Number(id));

export function truckLocation(truckId) {
  const t = find(truckId);
  if (!t) return { text: `I couldn't find truck ${truckId}.`, highlight: null };
  const text = t.status === "idle"
    ? `Truck ${t.id} is idle at ${t.location}.`
    : `Truck ${t.id} is ${t.location.replace(/^Near/, "near")}, on the ${t.from} to ${t.to} route, ${t.progress}% done. ${t.status === "delayed" ? "It is running late. " : ""}Arrival in about ${hrs(t.etaHours)}.`;
  return { text, highlight: t.id };
}

export function tripStatus() {
  const f = loadFleet();
  const c = (s) => f.filter((t) => t.status === s);
  const late = c("delayed").map((t) => `truck ${t.id}`);
  const text = `${c("on_trip").length} trucks are on time, ${late.length} are delayed, and ${c("idle").length} are idle.` +
    (late.length ? ` Delayed: ${late.join(", ")}.` : "");
  return { text, highlight: null };
}

export function paymentsDue() {
  const due = loadFleet().filter((t) => t.payment).sort((a, b) => a.payment.dueInDays - b.payment.dueInDays);
  const total = due.reduce((s, t) => s + t.payment.amountInr, 0);
  const lines = due.slice(0, 3).map((t) => `${t.payment.party}, ${inr(t.payment.amountInr)}, ${t.payment.dueInDays === 0 ? "due today" : `due in ${t.payment.dueInDays} day${t.payment.dueInDays === 1 ? "" : "s"}`}`);
  return { text: `${due.length} payments are pending, ${inr(total)} in total. Next: ${lines.join("; ")}.`, highlight: due[0]?.id ?? null };
}

export function driverCheckin(driverName) {
  const q = String(driverName).toLowerCase();
  const t = loadFleet().find((x) => x.driver.toLowerCase().includes(q));
  if (!t) return { text: `I couldn't find a driver named ${driverName}.`, highlight: null };
  return { text: `${t.driver} on truck ${t.id} last checked in ${ago(t.checkInMinAgo)}.${t.checkInMinAgo > 120 ? " That is overdue, so consider calling." : ""}`, highlight: t.id };
}
