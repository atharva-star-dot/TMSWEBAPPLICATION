import { NextRequest } from "next/server";
import {
  getVoiceState,
  setVoiceState,
  loadFleetForToken,
  executeFleetTool,
  DEMO_API_TOKEN,
  DEMO_COMPANY_ID,
} from "@/lib/fleet";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/voice/state — returns the latest voice state for a company.
 * The Fire TV app polls this to show Alexa answers on the TV.
 */
export async function GET(request: NextRequest) {
  const companyId =
    request.nextUrl.searchParams.get("company_id") || DEMO_COMPANY_ID;

  const state = await getVoiceState(companyId);

  return Response.json(state, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-cache, no-store",
    },
  });
}

/**
 * POST /api/voice/state — execute a tool and persist the result.
 * Accepts: { tool: string, args: object, token?: string }
 * If no token is provided, uses the demo token.
 */
export async function POST(request: NextRequest) {
  let body: { tool?: string; args?: Record<string, unknown>; token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const toolName = body.tool;
  if (!toolName) {
    return Response.json(
      { error: "Missing 'tool' field. Expected: truck_location | trip_status | payments_due | driver_checkin" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Resolve token: from body, Authorization header, or default to demo
  const authHeader = request.headers.get("authorization") ?? "";
  const headerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const token = body.token || headerToken || DEMO_API_TOKEN;

  const fleet = await loadFleetForToken(token);
  if (!fleet) {
    return Response.json(
      { error: "Invalid API token." },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const args = (body.args ?? {}) as Record<string, unknown>;
  const result = executeFleetTool(fleet, toolName, args as Record<string, string>);

  // Persist to Supabase voice_state
  const state = await setVoiceState(result.highlight, result.text, DEMO_COMPANY_ID);

  return Response.json(
    { ...result, at: state.at },
    { status: 200, headers: CORS_HEADERS }
  );
}
