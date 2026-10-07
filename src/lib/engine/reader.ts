import type { Intent, ModelReading, Seller } from "./types";

/**
 * Rules-based reader used when no model key is configured, and as a cross-check
 * when one is. It classifies intent only. It never extracts or applies bank
 * details: the output cannot change a beneficiary.
 */
const BANK_CHANGE = [
  /new (bank )?account/i,
  /change (my )?(bank|account|payout)/i,
  /update (my )?(bank|account|payout) (details|info)/i,
  /(send|pay) (it |this |the payout |my payout )?(to|into) (my |this )?(other|new|different)/i,
  /account (number|details) (has|have) changed/i,
  /iban/i,
];
const DISPUTE = [/refund/i, /damaged/i, /broken/i, /chargeback/i, /not (as )?described/i, /never arrived/i];
const QUERY = [/where('?s| is) my (money|payout|payment)/i, /when (will|do) i get paid/i, /haven'?t (been )?paid/i];

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const i = Math.max(0, (m.index ?? 0) - 40);
      return text.slice(i, Math.min(text.length, (m.index ?? 0) + m[0].length + 60)).trim();
    }
  }
  return undefined;
}

export function matchSeller(from: string, body: string, sellers: Seller[]): Seller | undefined {
  const f = from.toLowerCase();
  const byEmail = sellers.find((s) => f.includes(s.email.toLowerCase()));
  if (byEmail) return byEmail;
  const hay = `${from} ${body}`.toLowerCase();
  return sellers.find((s) => hay.includes(s.name.toLowerCase()) || hay.includes(s.shop.toLowerCase()));
}

export function readByRules(from: string, subject: string, body: string, sellers: Seller[]): ModelReading {
  const text = `${subject}\n${body}`;
  const seller = matchSeller(from, text, sellers);
  let intent: Intent = "OTHER";
  let evidence = "";
  let confidence = 0.5;
  const bank = firstMatch(text, BANK_CHANGE);
  const dispute = firstMatch(text, DISPUTE);
  const query = firstMatch(text, QUERY);
  if (bank) {
    intent = "BANK_CHANGE_REQUEST";
    evidence = bank;
    confidence = 0.92;
  } else if (dispute) {
    intent = "DISPUTE";
    evidence = dispute;
    confidence = 0.8;
  } else if (query) {
    intent = "PAYOUT_QUERY";
    evidence = query;
    confidence = 0.85;
  }
  return { intent, sellerId: seller?.id, confidence, evidence: evidence || body.slice(0, 120), reader: "rules" };
}

export const READER_SYSTEM_PROMPT = `You classify one inbound message to a marketplace's payouts team.
Return JSON only: {"intent": "BANK_CHANGE_REQUEST" | "DISPUTE" | "PAYOUT_QUERY" | "OTHER", "confidence": number between 0 and 1, "evidence": "the exact sentence from the message that supports the intent"}.
Rules:
- BANK_CHANGE_REQUEST: the sender asks for payouts to go to a different account, or says their bank details changed.
- Never output account numbers, amounts or instructions. Quote evidence verbatim.
- If unsure, use OTHER with low confidence.`;
