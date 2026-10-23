import { createAdminClient } from "@/lib/supabase/admin";

export interface TruckPayment {
  party: string;
  amountInr: number;
  dueInDays: number;
}

export type TruckStatus = "on_trip" | "delayed" | "idle";

export interface Truck {
  id: number;
  regNo: string;
  driver: string;
  from: string;
  to: string;
  status: TruckStatus;
  progress: number; // 0..100 (simulated)
  location: string; // (simulated)
  etaHours: number; // (simulated)
  checkInMinAgo: number; // (simulated)
  load: string;
  payment: TruckPayment | null;
  isSimulated: boolean;
  billNumber?: string;
  notes?: string;
}

export interface FleetResponse {
  operator: string;
  simulated: boolean;
  trucks: Truck[];
}

export interface VoiceState {
  highlight: number | null;
  text: string;
  at: number;
}

export const DEMO_COMPANY_ID = "d0000000-0000-0000-0000-000000000001";
export const DEMO_API_TOKEN = "sarthiwala_demo_token_2026";

/**
 * Deterministically derives an intermediate highway corridor waypoint for simulated telemetry.
 */
function deriveWaypoint(from: string, to: string, progress: number): string {
  const pair = `${from.trim().toLowerCase()}->${to.trim().toLowerCase()}`;
  if (pair.includes("pune") && pair.includes("bengaluru")) {
    if (progress < 30) return "Near Satara, NH48";
    if (progress < 60) return "Near Kolhapur, NH48";
    return "Near Belagavi, NH48";
  }
  if (pair.includes("pune") && pair.includes("mumbai")) {
    if (progress < 40) return "Lonavala Bypass, Expressway";
    if (progress < 75) return "Khopoli, Mumbai-Pune Expy";
    return "Near Vashi Toll, Navi Mumbai";
  }
  if (pair.includes("nashik") && pair.includes("surat")) {
    if (progress < 45) return "Near Dharampur, Gujarat border";
    if (progress < 80) return "Near Vapi Check-post, NH48";
    return "Near Navsari, NH48";
  }
  if (pair.includes("pune") && pair.includes("nagpur")) {
    if (progress < 35) return "Near Ahmednagar Bypass";
    if (progress < 70) return "Near Jalna, Samruddhi Mahamarg";
    return "Near Wardha, Samruddhi Mahamarg";
  }
  if (pair.includes("nashik") && pair.includes("jnpt")) {
    if (progress < 40) return "Kasara Ghat Section";
    if (progress < 75) return "Near Bhiwandi Logistics Corridor";
    return "Near Kalamboli Junction, JNPT Access";
  }
  if (pair.includes("kolhapur") && pair.includes("pune")) {
    if (progress < 40) return "Near Karad, NH48";
    if (progress < 75) return "Near Shirwal, NH48";
    return "Near Khed Shivapur Toll";
  }
  if (pair.includes("aurangabad") && pair.includes("mumbai")) {
    if (progress < 40) return "Samruddhi Mahamarg, Shirdi section";
    if (progress < 75) return "Near Shahapur, NH160";
    return "Near Thane City Entry";
  }
  if (pair.includes("pune") && pair.includes("solapur")) {
    if (progress < 40) return "Near Daund Phata, NH65";
    if (progress < 75) return "Near Indapur, NH65";
    return "Near Mohol, NH65";
  }
  if (pair.includes("jalgaon") && pair.includes("pune")) {
    if (progress < 40) return "Near Chalisgaon";
    if (progress < 75) return "Near Rahuri / Ahmednagar";
    return "Near Shikrapur Industrial Area";
  }
  if (pair.includes("mumbai") && pair.includes("goa")) {
    if (progress < 35) return "Near Mangaon, NH66";
    if (progress < 65) return "Near Chiplun / Khed, NH66";
    return "Near Kankavli, Konkan corridor";
  }

  if (progress < 30) return `Leaving ${from}, Highway`;
  if (progress < 75) return `Midway on ${from} - ${to} corridor`;
  return `Approaching ${to} terminal`;
}

/**
 * Transforms raw database bills into the standard trucks fleet model, grouped by vehicle number.
 * Telemetry fields with no source are deterministically derived and clearly labeled "(simulated)".
 */
export function transformBillsToFleet(bills: any[], operatorName = "Vadane Roadlines (demo)"): FleetResponse {
  // 1. Group bills by vehicle_number (case/space-insensitive normalization)
  const byVehicle = new Map<string, any[]>();
  for (const bill of bills) {
    const rawReg = (bill.vehicle_number || "").trim().toUpperCase();
    if (!rawReg) continue;
    const existing = byVehicle.get(rawReg) ?? [];
    existing.push(bill);
    byVehicle.set(rawReg, existing);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trucks: Truck[] = [];
  let index = 1;

  for (const [regNo, group] of byVehicle.entries()) {
    // Pick the most relevant active bill: prioritize Pending bills, then sort by bill_date desc
    group.sort((a, b) => {
      if (a.bill_status === "Pending" && b.bill_status !== "Pending") return -1;
      if (b.bill_status === "Pending" && a.bill_status !== "Pending") return 1;
      const dateA = new Date(a.bill_date || 0).getTime();
      const dateB = new Date(b.bill_date || 0).getTime();
      return dateB - dateA;
    });

    const bill = group[0];
    const billDate = bill.bill_date ? new Date(bill.bill_date) : today;
    const ageDays = Math.max(0, Math.round((today.getTime() - billDate.getTime()) / 86400000));

    // Determine truck ID from bill number or fallback to sequential index
    const billNumMatch = String(bill.bill_number || "").match(/(\d+)$/);
    const truckId = billNumMatch ? parseInt(billNumMatch[1], 10) : index;

    // Derive status: Delivered/Cancelled = idle. Pending = on_trip vs delayed based on age or notes
    let status: TruckStatus = "on_trip";
    if (bill.bill_status === "Delivered" || bill.bill_status === "Cancelled") {
      status = "idle";
    } else if (ageDays >= 2 || String(bill.additional_notes || "").toLowerCase().includes("delay")) {
      status = "delayed";
    }

    const fromLoc = bill.from_location || "Pune";
    const toLoc = bill.to_location || "Mumbai";

    // Deterministically derive telemetry fields (labelled simulated)
    let progress = 50;
    let etaHours = 3.0;
    let location = "";
    let checkInMinAgo = 15;

    if (status === "idle") {
      progress = 100;
      etaHours = 0;
      location = `${toLoc} Depot (simulated)`;
      checkInMinAgo = ((truckId * 17) % 150) + 10;
    } else if (status === "delayed") {
      progress = Math.min(60, Math.max(20, 25 + ((truckId * 11) % 35)));
      etaHours = Math.max(1.5, +((100 - progress) / 12).toFixed(1));
      location = `${deriveWaypoint(fromLoc, toLoc, progress)} (simulated - delayed)`;
      checkInMinAgo = 125 + ((truckId * 23) % 180); // > 120 minutes overdue check-in
    } else {
      progress = Math.min(95, Math.max(25, 30 + ((truckId * 13) % 60)));
      etaHours = Math.max(0.5, +((100 - progress) / 20).toFixed(1));
      location = `${deriveWaypoint(fromLoc, toLoc, progress)} (simulated)`;
      checkInMinAgo = ((truckId * 7) % 45) + 5;
    }

    // Payment details
    let payment: TruckPayment | null = null;
    if (bill.payment_status === "Unpaid" || bill.payment_status === "Partial") {
      let dueInDays = 3;
      if (bill.due_date) {
        const dueDate = new Date(bill.due_date);
        dueInDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
      } else {
        // Fallback: 5 days from bill date
        dueInDays = Math.max(0, 5 - ageDays);
      }
      payment = {
        party: bill.client_address || bill.goods_description || "Customer",
        amountInr: Number(bill.total_freight) || 0,
        dueInDays: Math.max(0, dueInDays),
      };
    }

    trucks.push({
      id: truckId,
      regNo,
      driver: bill.driver_name || "Assigned Driver",
      from: fromLoc,
      to: toLoc,
      status,
      progress,
      location,
      etaHours,
      checkInMinAgo,
      load: bill.goods_description || bill.job_description || "General Goods",
      payment,
      isSimulated: true,
      billNumber: bill.bill_number,
      notes: bill.additional_notes,
    });

    index++;
  }

  // Sort by truck ID ascending
  trucks.sort((a, b) => a.id - b.id);

  return {
    operator: operatorName,
    simulated: true,
    trucks,
  };
}

/**
 * Loads fleet data from Supabase for a given API token, or returns null if unauthorized.
 */
export async function loadFleetForToken(token: string | null): Promise<FleetResponse | null> {
  if (!token) return null;

  try {
    const admin = createAdminClient();

    // 1. Look up token in api_tokens
    const { data: tokenRow } = await admin
      .from("api_tokens")
      .select("company_id")
      .eq("token", token)
      .single();

    let companyId = tokenRow?.company_id;

    // 2. Fallback to companies.api_token
    if (!companyId) {
      const { data: compRow } = await admin
        .from("companies")
        .select("id")
        .eq("api_token", token)
        .single();
      companyId = compRow?.id;
    }

    // Special allowance for demo token if DB not seeded yet
    if (!companyId && token === DEMO_API_TOKEN) {
      companyId = DEMO_COMPANY_ID;
    }

    if (!companyId) return null;

    // Fetch company name
    const { data: company } = await admin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const operatorName = company?.name || "Transport Fleet";

    // Fetch bills for this company
    const { data: bills, error } = await admin
      .from("bills")
      .select("*")
      .eq("company_id", companyId)
      .order("bill_date", { ascending: false });

    if (error || !bills || bills.length === 0) {
      // If demo company has no bills in DB, load fallback demo fleet
      if (companyId === DEMO_COMPANY_ID) {
        return getFallbackDemoFleet();
      }
      return { operator: operatorName, simulated: true, trucks: [] };
    }

    return transformBillsToFleet(bills, operatorName);
  } catch (err) {
    console.error("loadFleetForToken error:", err);
    if (token === DEMO_API_TOKEN) {
      return getFallbackDemoFleet();
    }
    return null;
  }
}

/**
 * Loads the DEMO fleet data.
 */
export async function loadDemoFleet(): Promise<FleetResponse> {
  const result = await loadFleetForToken(DEMO_API_TOKEN);
  return result ?? getFallbackDemoFleet();
}

/**
 * Persisted Voice State operations via Supabase
 */
export async function getVoiceState(companyId = DEMO_COMPANY_ID): Promise<VoiceState> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("voice_state")
      .select("highlight, text, updated_at")
      .eq("company_id", companyId)
      .single();

    if (data) {
      return {
        highlight: data.highlight ? Number(data.highlight) || null : null,
        text: data.text || "",
        at: Number(data.updated_at) || 0,
      };
    }
  } catch {
    // fallback
  }

  return { highlight: null, text: "", at: 0 };
}

export async function setVoiceState(
  highlight: number | string | null,
  text: string,
  companyId = DEMO_COMPANY_ID
): Promise<VoiceState> {
  const now = Date.now();
  const newState: VoiceState = {
    highlight: highlight !== null ? Number(highlight) || null : null,
    text,
    at: now,
  };

  try {
    const admin = createAdminClient();
    await admin.from("voice_state").upsert({
      company_id: companyId,
      highlight: highlight !== null ? String(highlight) : null,
      text,
      updated_at: now,
    });
  } catch (err) {
    console.error("Failed to persist voice_state to Supabase:", err);
  }

  return newState;
}

// ============================================================================
// Voice & MCP Shared Tool Execution Functions
// ============================================================================

const formatHrs = (h: number) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} minutes` : `${Math.floor(m / 60)} hours ${m % 60} minutes`;
};

const formatInr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const formatAgo = (m: number) => (m < 60 ? `${m} minutes ago` : `${Math.floor(m / 60)} hours ago`);

export function executeTruckLocation(fleet: FleetResponse, truckId: number | string) {
  const targetId = Number(truckId);
  const t = fleet.trucks.find(
    (x) => x.id === targetId || x.regNo.toLowerCase().replace(/\s+/g, "") === String(truckId).toLowerCase().replace(/\s+/g, "")
  );

  if (!t) {
    return { text: `I couldn't find truck ${truckId}.`, highlight: null };
  }

  const text =
    t.status === "idle"
      ? `Truck ${t.id} (${t.regNo}) is idle at ${t.location}.`
      : `Truck ${t.id} (${t.regNo}) is ${t.location.replace(/^Near/, "near")}, on the ${t.from} to ${t.to} route, ${t.progress}% done. ${
          t.status === "delayed" ? "It is running late. " : ""
        }Arrival in about ${formatHrs(t.etaHours)}.`;

  return { text, highlight: t.id };
}

export function executeTripStatus(fleet: FleetResponse) {
  const f = fleet.trucks;
  const onTime = f.filter((t) => t.status === "on_trip");
  const delayed = f.filter((t) => t.status === "delayed");
  const idle = f.filter((t) => t.status === "idle");

  const lateList = delayed.map((t) => `truck ${t.id} (${t.regNo})`);
  const text =
    `${onTime.length} trucks are on time, ${delayed.length} are delayed, and ${idle.length} are idle.` +
    (lateList.length ? ` Delayed: ${lateList.join(", ")}.` : "");

  return { text, highlight: delayed[0]?.id ?? null };
}

export function executePaymentsDue(fleet: FleetResponse) {
  const due = fleet.trucks
    .filter((t): t is Truck & { payment: TruckPayment } => t.payment !== null)
    .sort((a, b) => a.payment.dueInDays - b.payment.dueInDays);

  const total = due.reduce((sum, t) => sum + t.payment.amountInr, 0);
  const lines = due.slice(0, 3).map((t) => {
    const days = t.payment.dueInDays;
    const dueStr = days === 0 ? "due today" : `due in ${days} day${days === 1 ? "" : "s"}`;
    return `${t.payment.party}, ${formatInr(t.payment.amountInr)}, ${dueStr}`;
  });

  const text = `${due.length} payments are pending, ${formatInr(total)} in total. Next: ${lines.join("; ")}.`;
  return { text, highlight: due[0]?.id ?? null };
}

export function executeDriverCheckin(fleet: FleetResponse, driverName: string) {
  const q = String(driverName).toLowerCase().trim();
  const t = fleet.trucks.find((x) => x.driver.toLowerCase().includes(q));

  if (!t) {
    return { text: `I couldn't find a driver named ${driverName}.`, highlight: null };
  }

  const text = `${t.driver} on truck ${t.id} last checked in ${formatAgo(t.checkInMinAgo)}.${
    t.checkInMinAgo > 120 ? " That is overdue, so consider calling." : ""
  }`;

  return { text, highlight: t.id };
}

export function executeFleetTool(
  fleet: FleetResponse,
  toolName: string,
  args: Record<string, any>
): { text: string; highlight: number | null } {
  switch (toolName) {
    case "truck_location":
      return executeTruckLocation(fleet, args.truckId ?? args.truck_id ?? args.id ?? 1);
    case "trip_status":
      return executeTripStatus(fleet);
    case "payments_due":
      return executePaymentsDue(fleet);
    case "driver_checkin":
      return executeDriverCheckin(fleet, args.driverName ?? args.driver_name ?? args.name ?? "");
    default:
      return { text: `Unknown tool '${toolName}'.`, highlight: null };
  }
}

/**
 * Fallback static demo fleet when Supabase is unreachable or unseeded.
 */
function getFallbackDemoFleet(): FleetResponse {
  return {
    operator: "Vadane Roadlines (demo)",
    simulated: true,
    trucks: [
      {
        id: 1,
        regNo: "MH 12 QR 4021",
        driver: "Ramesh Pawar",
        from: "Pune",
        to: "Bengaluru",
        status: "on_trip",
        progress: 62,
        location: "Near Satara, NH48 (simulated)",
        etaHours: 3.4,
        checkInMinAgo: 12,
        load: "Steel coils, 14 t",
        payment: { party: "Shree Steel Corp, Pune", amountInr: 18500, dueInDays: 3 },
        isSimulated: true,
      },
      {
        id: 2,
        regNo: "MH 14 GT 7788",
        driver: "Sunil Jadhav",
        from: "Pune",
        to: "Mumbai",
        status: "on_trip",
        progress: 81,
        location: "Khopoli, Mumbai-Pune Expy (simulated)",
        etaHours: 1.1,
        checkInMinAgo: 25,
        load: "Packaged FMCG, 9 t",
        payment: null,
        isSimulated: true,
      },
      {
        id: 3,
        regNo: "MH 12 AB 3310",
        driver: "Vijay Shinde",
        from: "Nashik",
        to: "Surat",
        status: "delayed",
        progress: 44,
        location: "Near Vapi Check-post, NH48 (simulated - delayed)",
        etaHours: 5.2,
        checkInMinAgo: 190,
        load: "Onions, 16 t",
        payment: { party: "Gujarat Agro Industries, Vapi", amountInr: 42000, dueInDays: 0 },
        isSimulated: true,
      },
      {
        id: 4,
        regNo: "MH 04 CD 5522",
        driver: "Amit Kulkarni",
        from: "Pune",
        to: "Nagpur",
        status: "idle",
        progress: 100,
        location: "Nagpur Depot (simulated)",
        etaHours: 0,
        checkInMinAgo: 70,
        load: "Automotive stampings, 12 t",
        payment: { party: "Tata Motors Vendor Hub, Pune", amountInr: 52000, dueInDays: 1 },
        isSimulated: true,
      },
      {
        id: 5,
        regNo: "MH 15 EF 9012",
        driver: "Ganesh Patil",
        from: "Nashik",
        to: "JNPT Nhava Sheva",
        status: "on_trip",
        progress: 68,
        location: "Near Bhiwandi Logistics Corridor (simulated)",
        etaHours: 2.3,
        checkInMinAgo: 18,
        load: "Export engine heads, 18 t",
        payment: { party: "Mahindra Auto Feeder, Igatpuri", amountInr: 31500, dueInDays: 2 },
        isSimulated: true,
      },
      {
        id: 6,
        regNo: "MH 09 KL 6633",
        driver: "Santosh Shinde",
        from: "Kolhapur",
        to: "Pune",
        status: "delayed",
        progress: 38,
        location: "Near Karad, NH48 (simulated - delayed)",
        etaHours: 4.8,
        checkInMinAgo: 155,
        load: "Refined sugar, 20 t",
        payment: { party: "Shree Steel Corp (Food Division)", amountInr: 24000, dueInDays: 4 },
        isSimulated: true,
      },
      {
        id: 7,
        regNo: "MH 20 OP 1144",
        driver: "Deepak More",
        from: "Aurangabad",
        to: "Mumbai",
        status: "idle",
        progress: 100,
        location: "Mumbai Depot (simulated)",
        etaHours: 0,
        checkInMinAgo: 45,
        load: "Solvent drums, 10 t",
        payment: null,
        isSimulated: true,
      },
      {
        id: 8,
        regNo: "MH 12 XY 8899",
        driver: "Rahul Deshmukh",
        from: "Pune",
        to: "Solapur",
        status: "on_trip",
        progress: 55,
        location: "Near Indapur, NH65 (simulated)",
        etaHours: 2.8,
        checkInMinAgo: 22,
        load: "Spun yarn boxes, 11 t",
        payment: { party: "Reliance FMCG Supply", amountInr: 19500, dueInDays: 5 },
        isSimulated: true,
      },
      {
        id: 9,
        regNo: "MH 31 ZA 2244",
        driver: "Sachin Chavan",
        from: "Jalgaon",
        to: "Pune",
        status: "on_trip",
        progress: 88,
        location: "Near Shikrapur Industrial Area (simulated)",
        etaHours: 0.9,
        checkInMinAgo: 14,
        load: "Fresh fruit crates, 15 t",
        payment: { party: "Gujarat Agro Industries", amountInr: 34000, dueInDays: 0 },
        isSimulated: true,
      },
      {
        id: 10,
        regNo: "MH 11 BC 7711",
        driver: "Pravin Gaikwad",
        from: "Satara",
        to: "Pune",
        status: "idle",
        progress: 100,
        location: "Pune Depot (simulated)",
        etaHours: 0,
        checkInMinAgo: 85,
        load: "Rolled steel billets, 16 t",
        payment: { party: "Shree Steel Corp", amountInr: 16000, dueInDays: 3 },
        isSimulated: true,
      },
      {
        id: 11,
        regNo: "MH 04 JK 9900",
        driver: "Nitin Bhosale",
        from: "Mumbai",
        to: "Goa",
        status: "on_trip",
        progress: 72,
        location: "Near Chiplun / Khed, NH66 (simulated)",
        etaHours: 3.5,
        checkInMinAgo: 30,
        load: "Tablets & medical packing, 8 t",
        payment: null,
        isSimulated: true,
      },
      {
        id: 12,
        regNo: "MH 05 LM 3344",
        driver: "Mahendra Kale",
        from: "Thane",
        to: "Nashik",
        status: "delayed",
        progress: 42,
        location: "Kasara Ghat Section (simulated - delayed)",
        etaHours: 4.1,
        checkInMinAgo: 140,
        load: "Hydraulic rams & seals, 13 t",
        payment: { party: "Mahindra Auto Feeder", amountInr: 26500, dueInDays: 2 },
        isSimulated: true,
      },
    ],
  };
}
