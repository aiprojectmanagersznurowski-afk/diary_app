// Shared iOS-style primitives: glass cards, gradient text, pills.
import { ReactNode } from "react";
import { EMOTIONS } from "../data";

export function GradientText({
  children,
  className = "",
  from = "#A78BFA",
  via = "#F472B6",
  to = "#60A5FA",
}: {
  children: ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
}) {
  return (
    <span
      className={className}
      style={{
        backgroundImage: `linear-gradient(100deg, ${from}, ${via}, ${to})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  );
}

export function GlassCard({
  children,
  className = "",
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl ${
        onClick ? "cursor-pointer active:scale-[0.985] transition-transform" : ""
      } ${className}`}
      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.35)", ...style }}
    >
      {children}
    </div>
  );
}

export function EmotionPill({ id }: { id: string }) {
  const e = EMOTIONS[id];
  if (!e) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/10"
      style={{
        background: `linear-gradient(120deg, ${e.from}22, ${e.to}22)`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: `linear-gradient(120deg, ${e.from}, ${e.to})` }}
      />
      <span className="text-white/85" style={{ fontSize: 12 }}>
        {e.label}
      </span>
    </span>
  );
}

// Ambient pastel glow background used behind screens.
export function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-24 -left-20 size-72 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, #A78BFA, transparent 70%)" }}
      />
      <div
        className="absolute top-32 -right-24 size-72 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, #F472B6, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/4 size-72 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, #60A5FA, transparent 70%)" }}
      />
    </div>
  );
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const days = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  return {
    weekday: days[d.getDay()],
    full: `${d.getDate()} ${months[d.getMonth()]}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}
