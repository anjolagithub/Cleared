import { NextResponse } from "next/server";
import {
  advance,
  airwallexConfigured,
  createTransfer,
  findByRequestId,
  getTransfer,
} from "@/lib/rail/airwallex-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!airwallexConfigured()) {
    return NextResponse.json({ error: "Airwallex sandbox keys are not configured." }, { status: 501 });
  }
  const { action } = await params;
  const body = await req.json();
  try {
    switch (action) {
      case "create":
        return NextResponse.json(await createTransfer(body));
      case "find":
        return NextResponse.json({ transfer: await findByRequestId(body.requestId) });
      case "get":
        return NextResponse.json(await getTransfer(body.id));
      case "advance":
        return NextResponse.json(await advance(body.id, body.failWith));
      default:
        return NextResponse.json({ error: `Unknown action ${action}` }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
