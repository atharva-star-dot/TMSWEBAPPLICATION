import { NextRequest } from "next/server";
import { loadFleetForToken, DEMO_API_TOKEN } from "@/lib/fleet";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  // Extract Bearer token
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : request.nextUrl.searchParams.get("token");

  // Allow demo token via query param for easy curl testing
  const effectiveToken = token || null;

  if (!effectiveToken) {
    return Response.json(
      { error: "Missing Authorization header. Use: Bearer <token>" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const fleet = await loadFleetForToken(effectiveToken);

  if (!fleet) {
    return Response.json(
      { error: "Invalid or expired API token." },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  return Response.json(fleet, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
    },
  });
}
