import { NextResponse } from "next/server";
import { airwallexConfigured } from "@/lib/rail/airwallex-server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    airwallex: airwallexConfigured(),
    model: !!process.env.ANTHROPIC_API_KEY,
  });
}
