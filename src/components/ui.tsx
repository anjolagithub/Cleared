import { ChartPieSlice, CheckCircle, PauseCircle, Prohibit } from "@phosphor-icons/react/dist/ssr";
import type { Outcome } from "@/lib/engine/types";

export const OUTCOME_STYLE: Record<Outcome, { fg: string; bg: string; bar: string; verb: string; word: string }> = {
  CLEAR: { fg: "text-clear", bg: "bg-clear-bg", bar: "bg-clear", verb: "Send in full", word: "Clear" },
  REDUCE: { fg: "text-reduce", bg: "bg-reduce-bg", bar: "bg-reduce", verb: "Send part, keep a reserve", word: "Reduce" },
  HOLD: { fg: "text-hold", bg: "bg-hold-bg", bar: "bg-hold", verb: "Wait for a person or an event", word: "Hold" },
  BLOCK: { fg: "text-block", bg: "bg-block-bg", bar: "bg-block", verb: "Do not send", word: "Block" },
};

export const OUTCOME_HEX: Record<Outcome, string> = {
  CLEAR: "#17805a",
  REDUCE: "#a8640f",
  HOLD: "#2d5ba8",
  BLOCK: "#bf3b30",
};

export function DecisionMark({ outcome, size = "md" }: { outcome: Outcome; size?: "sm" | "md" | "lg" }) {
  const s = OUTCOME_STYLE[outcome];
  const pad = size === "lg" ? "px-3 py-1.5 text-base" : size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[5px] font-semibold ${pad} ${s.bg} ${s.fg}`}>
      <OutcomeGlyph outcome={outcome} />
      {s.word}
    </span>
  );
}

const GLYPH = { CLEAR: CheckCircle, REDUCE: ChartPieSlice, HOLD: PauseCircle, BLOCK: Prohibit } as const;

export function OutcomeGlyph({ outcome, className = "h-3.5 w-3.5" }: { outcome: Outcome; className?: string }) {
  const Icon = GLYPH[outcome];
  return <Icon weight="bold" className={className} aria-hidden />;
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight text-ink ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#1d3a57" />
        <rect x="7" y="9" width="4" height="14" rx="1" fill="#17805a" />
        <path d="M14 16.5l3.2 3.2L25 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Cleared
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  const v = {
    primary: "bg-tower text-white hover:bg-tower-hi disabled:bg-ink-3",
    secondary: "bg-panel text-ink border border-rule hover:border-ink-3 disabled:text-ink-3",
    quiet: "text-tower hover:bg-rule-soft disabled:text-ink-3",
    danger: "bg-panel text-block border border-block/40 hover:bg-block-bg",
  }[variant];
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </button>
  );
}
