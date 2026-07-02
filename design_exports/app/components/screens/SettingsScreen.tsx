import { useState } from "react";
import { ChevronLeft, Check, LogOut, Palette } from "lucide-react";
import { GOALS } from "../../data";
import { GlassCard, GradientText } from "../ui";

const THEMES = [
  { id: "aurora", label: "Aurora", from: "#A78BFA", to: "#F472B6" },
  { id: "ocean", label: "Ocean", from: "#38BDF8", to: "#818CF8" },
  { id: "sunset", label: "Zachód", from: "#FB7185", to: "#FBBF24" },
  { id: "mono", label: "Mono", from: "#9CA3AF", to: "#E5E7EB" },
];

export function SettingsScreen({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [theme, setTheme] = useState("aurora");

  return (
    <div className="h-full overflow-y-auto px-5 pt-14 pb-16 no-scrollbar flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="size-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} className="text-white/80" />
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          <GradientText>Ustawienia</GradientText>
        </h1>
      </div>

      {/* Theme selection */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Palette size={15} className="text-white/50" />
        <p className="text-white/50" style={{ fontSize: 13, fontWeight: 600 }}>Motyw kolorystyczny</p>
      </div>
      <GlassCard className="p-2 mb-6">
        {THEMES.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${
              theme === t.id ? "bg-white/[0.05]" : ""
            } ${i < THEMES.length - 1 ? "" : ""}`}
          >
            <span className="size-7 rounded-full border border-white/15" style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }} />
            <span className="text-white/85 flex-1 text-left" style={{ fontSize: 15 }}>{t.label}</span>
            {theme === t.id && (
              <span className="size-5 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }}>
                <Check size={13} className="text-white" />
              </span>
            )}
          </button>
        ))}
      </GlassCard>

      {/* Goals */}
      <p className="text-white/50 mb-3 px-1" style={{ fontSize: 13, fontWeight: 600 }}>Twoje cele</p>
      <GlassCard className="p-4 mb-3">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl px-3 py-2 border border-white/10"
              style={{ background: "linear-gradient(120deg, rgba(167,139,250,0.14), rgba(96,165,250,0.1))" }}
            >
              <p className="text-white/90" style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</p>
              <p className="text-white/45" style={{ fontSize: 11 }}>{g.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Reset goals */}
      <button className="w-full py-3.5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] active:scale-[0.98] transition-transform mb-8">
        <span className="text-red-400" style={{ fontSize: 15, fontWeight: 600 }}>Resetuj cele</span>
      </button>

      <div className="flex-1" />

      {/* Log out */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 active:opacity-60 transition-opacity"
      >
        <LogOut size={16} className="text-white/50" />
        <span className="text-white/50" style={{ fontSize: 15 }}>Wyloguj się</span>
      </button>
    </div>
  );
}
