import { NextResponse } from "next/server";
import { matchSeller, READER_SYSTEM_PROMPT, readByRules } from "@/lib/engine/reader";
import type { Intent, ModelReading, Seller } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

const INTENTS: Intent[] = ["BANK_CHANGE_REQUEST", "DISPUTE", "PAYOUT_QUERY", "OTHER"];

/**
 * The model reads; the code decides. This route only classifies a message.
 * Its output can quarantine a payout, never release one or edit bank details.
 */
export async function POST(req: Request) {
  const { from, subject, body, sellers } = (await req.json()) as {
    from: string;
    subject: string;
    body: string;
    sellers: Seller[];
  };
  const rules = readByRules(from, subject, body, sellers);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json(rules);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 300,
        system: READER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `From: ${from}\nSubject: ${subject}\n\n${body}` }],
      }),
    });
    if (!res.ok) return NextResponse.json(rules);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content.find((c) => c.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
      intent: Intent;
      confidence: number;
      evidence: string;
    };
    if (!INTENTS.includes(parsed.intent)) return NextResponse.json(rules);
    // Seller identity is resolved by code from the sender, never by the model.
    const seller = matchSeller(from, `${subject} ${body}`, sellers);
    const reading: ModelReading = {
      intent: parsed.intent,
      sellerId: seller?.id,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      evidence: String(parsed.evidence || "").slice(0, 240),
      reader: "claude",
    };
    // Safety: if either reader sees a bank-change request, treat it as one.
    if (rules.intent === "BANK_CHANGE_REQUEST" && reading.intent !== "BANK_CHANGE_REQUEST") {
      return NextResponse.json({ ...rules, reader: "rules" });
    }
    return NextResponse.json(reading);
  } catch {
    return NextResponse.json(rules);
  }
}
