#!/usr/bin/env node
/**
 * scripts/smoke.mjs — Quick smoke test for Sarthiwala Control Room endpoints.
 *
 * Usage:
 *   node scripts/smoke.mjs                         # test against localhost:3000
 *   node scripts/smoke.mjs https://your-app.vercel.app
 */

const BASE = process.argv[2] || "http://localhost:3000";
const TOKEN = "sarthiwala_demo_token_2026";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log(`\n🔥 Smoke Testing: ${BASE}\n`);

// -- 1. /control-room (public page) ------------------------------------------
await test("GET /control-room → 200 HTML", async () => {
  const res = await fetch(`${BASE}/control-room`);
  assert(res.ok, `Status ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  assert(ct.includes("text/html"), `Expected HTML, got ${ct}`);
});

// -- 2. /api/fleet (Bearer token) ---------------------------------------------
await test("GET /api/fleet → 401 without token", async () => {
  const res = await fetch(`${BASE}/api/fleet`);
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test("GET /api/fleet → 403 with bad token", async () => {
  const res = await fetch(`${BASE}/api/fleet`, {
    headers: { Authorization: "Bearer bad_token_xyz" },
  });
  assert(res.status === 403, `Expected 403, got ${res.status}`);
});

await test("GET /api/fleet → 200 with demo token", async () => {
  const res = await fetch(`${BASE}/api/fleet`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.operator, "Missing operator");
  assert(Array.isArray(data.trucks), "Missing trucks array");
  assert(data.trucks.length > 0, "Empty trucks array");
  assert(data.simulated === true, "Missing simulated flag");
});

await test("GET /api/fleet → CORS headers present", async () => {
  const res = await fetch(`${BASE}/api/fleet`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const acao = res.headers.get("access-control-allow-origin");
  assert(acao === "*", `CORS header missing or wrong: ${acao}`);
});

// -- 3. /api/voice/state (GET + POST) -----------------------------------------
await test("GET /api/voice/state → 200 JSON", async () => {
  const res = await fetch(`${BASE}/api/voice/state`);
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert("text" in data, "Missing 'text' field");
  assert("at" in data, "Missing 'at' field");
});

await test("POST /api/voice/state → trip_status tool", async () => {
  const res = await fetch(`${BASE}/api/voice/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: "trip_status", args: {}, token: TOKEN }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.text && data.text.length > 0, "Empty tool response");
  assert(data.text.includes("truck"), `Unexpected response: ${data.text}`);
});

await test("POST /api/voice/state → truck_location tool", async () => {
  const res = await fetch(`${BASE}/api/voice/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: "truck_location", args: { truckId: 1 }, token: TOKEN }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.text && data.text.length > 0, "Empty tool response");
  assert(data.highlight === 1, `Expected highlight=1, got ${data.highlight}`);
});

await test("POST /api/voice/state → payments_due tool", async () => {
  const res = await fetch(`${BASE}/api/voice/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: "payments_due", args: {}, token: TOKEN }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.text.includes("₹"), `Expected INR amounts: ${data.text}`);
});

await test("POST /api/voice/state → driver_checkin tool", async () => {
  const res = await fetch(`${BASE}/api/voice/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: "driver_checkin", args: { driverName: "Ramesh" }, token: TOKEN }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.text.includes("Ramesh") || data.text.includes("couldn"), `Unexpected: ${data.text}`);
});

// -- 4. /api/mcp (JSON-RPC 2.0) -----------------------------------------------
await test("GET /api/mcp → server info", async () => {
  const res = await fetch(`${BASE}/api/mcp`);
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.name === "sarthiwala-fleet", `Unexpected name: ${data.name}`);
  assert(Array.isArray(data.tools), "Missing tools array");
});

await test("POST /api/mcp → initialize", async () => {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "smoke-test", version: "1.0" },
      },
    }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.result?.protocolVersion, "Missing protocolVersion");
  assert(data.result?.serverInfo?.name === "sarthiwala-fleet", "Wrong server name");
});

await test("POST /api/mcp → tools/list", async () => {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.result?.tools?.length === 4, `Expected 4 tools, got ${data.result?.tools?.length}`);
});

await test("POST /api/mcp → tools/call truck_location", async () => {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "truck_location",
        arguments: { truckId: 3 },
      },
    }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.result?.content?.[0]?.type === "text", "Missing text content");
  assert(!data.result?.isError, "Tool returned error");
});

await test("POST /api/mcp → tools/call trip_status", async () => {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "trip_status", arguments: {} },
    }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.result?.content?.[0]?.text?.includes("truck"), "Unexpected trip_status response");
});

await test("POST /api/mcp → unknown method → error", async () => {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "foo/bar" }),
  });
  assert(res.ok, `Status ${res.status}`);
  const data = await res.json();
  assert(data.error?.code === -32601, `Expected -32601, got ${data.error?.code}`);
});

// -- Summary ------------------------------------------------------------------
console.log(`\n────────────────────────────────────`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
