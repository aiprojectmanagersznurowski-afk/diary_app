import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { EMOTION_TREND, ENERGY_TREND } from "../../data";
import { GlassCard, GradientText } from "../ui";

const RANGES = ["7 Dni", "30 Dni"];

export function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  const [range, setRange] = useState(0);
  const goalAlignment = 72;

  return (
    <div className="h-full overflow-y-auto px-5 pt-14 pb-16 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="size-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} className="text-white/80" />
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          <GradientText>Twoje Analizy</GradientText>
        </h1>
      </div>

      {/* Range selector */}
      <div className="flex gap-1 p-1 rounded-2xl border border-white/10 bg-white/[0.04] mb-6">
        {RANGES.map((r, i) => (
          <button
            key={r}
            onClick={() => setRange(i)}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              range === i ? "text-white" : "text-white/45"
            }`}
            style={{
              fontSize: 14,
              fontWeight: 600,
              background: range === i ? "linear-gradient(120deg, #A78BFA, #F472B6)" : "transparent",
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart 1: Emotions over time */}
      <GlassCard className="p-4 mb-4">
        <p className="text-white/80 mb-1 px-1" style={{ fontSize: 15, fontWeight: 600 }}>Emocje w czasie</p>
        <p className="text-white/40 mb-4 px-1" style={{ fontSize: 12 }}>Stres vs. Spokój</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={EMOTION_TREND} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="stres" stroke="#FB7185" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="spokoj" stroke="#38BDF8" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-3 px-1">
          <Legend color="#FB7185" label="Stres" />
          <Legend color="#38BDF8" label="Spokój" />
        </div>
      </GlassCard>

      {/* Chart 2: Energy */}
      <GlassCard className="p-4 mb-4">
        <p className="text-white/80 mb-1 px-1" style={{ fontSize: 15, fontWeight: 600 }}>Poziom energii</p>
        <p className="text-white/40 mb-4 px-1" style={{ fontSize: 12 }}>Energia / zmęczenie w ciągu tygodnia</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ENERGY_TREND} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="energyStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#F472B6" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="energia" stroke="url(#energyStroke)" strokeWidth={3} fill="url(#energyFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Chart 3: Goal alignment gauge */}
      <GlassCard className="p-5">
        <p className="text-white/80 mb-4 px-1" style={{ fontSize: 15, fontWeight: 600 }}>Zgodność z celami życiowymi</p>
        <div className="flex items-center justify-center py-2">
          <Gauge value={goalAlignment} />
        </div>
        <p className="text-center text-white/40 mt-2" style={{ fontSize: 13 }}>
          Ostatnie dni przybliżyły Cię do celów
        </p>
      </GlassCard>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      <span className="text-white/55" style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative size-44">
      <svg className="size-full -rotate-90" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="50%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: 40, fontWeight: 800 }}>
          <GradientText>{value}%</GradientText>
        </span>
        <span className="text-white/40" style={{ fontSize: 12 }}>zgodności</span>
      </div>
    </div>
  );
}
