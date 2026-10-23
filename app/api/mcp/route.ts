import { NextRequest } from "next/server";
import {
  loadFleetForToken,
  executeFleetTool,
  setVoiceState,
  DEMO_API_TOKEN,
  DEMO_COMPANY_ID,
} from "@/lib/fleet";

/**
 * /api/mcp — Remote MCP server over Streamable HTTP.
 *
 * Implements the MCP JSON-RPC 2.0 protocol over a single HTTPS endpoint:
 *  - POST with Content-Type: application/json
 *  - Responds with application/json (synchronous, no streaming needed for these tools)
 *  - Bearer token authentication
 *
 * Tools exposed:
 *  1. truck_location  — Where is a truck and when will it arrive
 *  2. trip_status     — Summary of today's trips
 *  3. payments_due    — Pending payments from customers
 *  4. driver_checkin  — When a driver last checked in
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

const TOOL_DEFINITIONS = [
  {
    name: "truck_location",
    description: "Where is a truck and when will it arrive. Provide a truck ID (number) or vehicle registration number.",
    inputSchema: {
      type: "object" as const,
      properties: {
        truckId: {
          type: "number",
          description: "The truck number (e.g. 1, 2, 3) or registration (e.g. MH12QR4021)",
        },
      },
      required: ["truckId"],
    },
  },
  {
    name: "trip_status",
    description: "Summary of today's fleet trips: how many are on time, delayed, or idle.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "payments_due",
    description: "Pending payments from customers, sorted by due date, with amounts.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "driver_checkin",
    description: "When a driver last checked in. Provide a driver name or partial name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        driverName: {
          type: "string",
          description: "Driver name (or partial name) to look up",
        },
      },
      required: ["driverName"],
    },
  },
];

// -- Helpers ------------------------------------------------------------------

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

function jsonRpcResult(id: string | number | null, result: unknown) {
  return Response.json(
    { jsonrpc: "2.0", id, result },
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();
  return request.nextUrl.searchParams.get("token");
}

// -- Handlers -----------------------------------------------------------------

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/mcp — Required by Streamable HTTP spec for session initialization.
 * Returns server info as SSE or JSON depending on Accept header.
 */
export async function GET(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";

  // If client wants SSE, open an SSE stream with a server event
  if (accept.includes("text/event-stream")) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        const serverInfo = JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {},
        });
        controller.enqueue(encoder.encode(`event: message\ndata: ${serverInfo}\n\n`));
        controller.close();
      },
    });
    return new Response(body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Plain JSON fallback — return server capabilities
  return Response.json(
    {
      name: "sarthiwala-fleet",
      version: "1.0.0",
      description:
        "Sarthiwala Fleet Control Room MCP Server — truck locations, trip status, payments, and driver check-ins for a Maharashtra transport fleet. All telemetry is simulated.",
      tools: TOOL_DEFINITIONS,
    },
    { headers: CORS_HEADERS }
  );
}

/**
 * POST /api/mcp — JSON-RPC 2.0 message handler (Streamable HTTP transport).
 * Handles: initialize, tools/list, tools/call, ping
 */
export async function POST(request: NextRequest) {
  let body: {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error: invalid JSON");
  }

  const { id = null, method, params = {} } = body;

  if (!method) {
    return jsonRpcError(id, -32600, "Invalid request: missing 'method'");
  }

  // --- initialize ---
  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2025-03-26",
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: "sarthiwala-fleet",
        version: "1.0.0",
      },
    });
  }

  // --- notifications/initialized (client ack — no response needed) ---
  if (method === "notifications/initialized") {
    // Notification; respond with 202 Accepted (no JSON-RPC response for notifications)
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  // --- ping ---
  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  // --- tools/list ---
  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: TOOL_DEFINITIONS });
  }

  // --- tools/call ---
  if (method === "tools/call") {
    const toolName = params.name as string | undefined;
    const toolArgs = (params.arguments ?? {}) as Record<string, string>;

    if (!toolName) {
      return jsonRpcError(id, -32602, "Invalid params: missing 'name' for tool call");
    }

    const validTools = TOOL_DEFINITIONS.map((t) => t.name);
    if (!validTools.includes(toolName)) {
      return jsonRpcError(
        id,
        -32602,
        `Unknown tool '${toolName}'. Available: ${validTools.join(", ")}`
      );
    }

    // Authenticate — use Bearer token or fall back to demo
    const token = extractToken(request) || DEMO_API_TOKEN;
    const fleet = await loadFleetForToken(token);

    if (!fleet) {
      return jsonRpcResult(id, {
        content: [{ type: "text", text: "Authentication failed. Provide a valid Bearer token." }],
        isError: true,
      });
    }

    const result = executeFleetTool(fleet, toolName, toolArgs);

    // Persist voice state so Fire TV can show the answer
    await setVoiceState(result.highlight, result.text, DEMO_COMPANY_ID);

    return jsonRpcResult(id, {
      content: [{ type: "text", text: result.text }],
      isError: false,
    });
  }

  // --- resources/list, prompts/list (not implemented but spec-compliant) ---
  if (method === "resources/list") {
    return jsonRpcResult(id, { resources: [] });
  }
  if (method === "prompts/list") {
    return jsonRpcResult(id, { prompts: [] });
  }

  // --- Unknown method ---
  return jsonRpcError(id, -32601, `Method not found: '${method}'`);
}

/**
 * DELETE /api/mcp — Session termination (Streamable HTTP spec).
 */
export async function DELETE() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
