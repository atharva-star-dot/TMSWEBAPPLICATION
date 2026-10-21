import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { truckLocation, tripStatus, paymentsDue, driverCheckin } from "./tools.js";

// Last voice answer, polled by the Fire TV app so the TV can highlight a truck.
let state = { highlight: null, text: "", at: 0 };
const run = (fn) => (args) => {
  const r = fn(...Object.values(args ?? {}));
  state = { highlight: r.highlight, text: r.text, at: Date.now() };
  return { content: [{ type: "text", text: r.text }] };
};

const server = new McpServer({ name: "sarthiwala-fleet", version: "0.1.0" });
server.tool("truck_location", "Where is a truck and when will it arrive", { truckId: z.number() }, run(truckLocation));
server.tool("trip_status", "Summary of today's trips", {}, run(tripStatus));
server.tool("payments_due", "Pending payments from customers", {}, run(paymentsDue));
server.tool("driver_checkin", "When a driver last checked in", { driverName: z.string() }, run(driverCheckin));

// Tiny HTTP bridge for the TV app: GET /state (and /ask?tool=... for demos without Alexa).
const TOOLS = { truck_location: truckLocation, trip_status: tripStatus, payments_due: paymentsDue, driver_checkin: driverCheckin };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (u.pathname === "/ask") {
    const fn = TOOLS[u.searchParams.get("tool")];
    if (!fn) { res.statusCode = 404; return res.end("{}"); }
    const r = fn(u.searchParams.get("arg") ?? undefined);
    state = { highlight: r.highlight, text: r.text, at: Date.now() };
    return res.end(JSON.stringify(state));
  }
  res.end(JSON.stringify(state));
}).listen(Number(process.env.PORT ?? 8787), () => console.error("bridge on :" + (process.env.PORT ?? 8787)));

await server.connect(new StdioServerTransport());
