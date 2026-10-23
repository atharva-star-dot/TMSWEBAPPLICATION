import type { Metadata } from "next";
import { ControlRoomClient } from "./client";

export const metadata: Metadata = {
  title: "Sarthiwala Control Room — Fleet Dashboard (Demo)",
  description:
    "Live fleet tracking dashboard for Vadane Roadlines. All telemetry data is simulated for demonstration purposes.",
};

/**
 * /control-room — A public, unauthenticated page that shows the DEMO company fleet.
 * No Supabase session required; this is allow-listed in proxy.ts.
 */
export default function ControlRoomPage() {
  return <ControlRoomClient />;
}
