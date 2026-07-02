import { ChevronLeft, Sparkles, Quote } from "lucide-react";
import { ENTRIES } from "../../data";
import { GlassCard, GradientText, EmotionPill, formatDate } from "../ui";

export function EntryDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const entry = ENTRIES.find((e) => e.id === id) ?? ENTRIES[0];
  const d = formatDate(entry.date);

  return (
    <div className="h-full overflow-y-auto px-5 pt-14 pb-16 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="size-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} className="text-white/80" />
        </button>
        <div>
          <p style={{ fontSize: 17, fontWeight: 600 }} className="text-white capitalize">{d.weekday}</p>
          <p className="text-white/40" style={{ fontSize: 13 }}>{d.full} · {d.time}</p>
        </div>
      </div>

      {/* Transcription */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Quote size={15} className="text-white/40" />
          <span className="text-white/40" style={{ fontSize: 12, fontWeight: 600 }}>Transkrypcja</span>
        </div>
        <p className="text-white/80" style={{ fontSize: 16, lineHeight: 1.6 }}>
          {entry.transcription}
        </p>
      </GlassCard>

      {/* AI Insights */}
      <div className="flex items-center gap-2 mb-3 mt-6 px-1">
        <Sparkles size={16} className="text-fuchsia-300" />
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          <GradientText>AI Insights</GradientText>
        </h2>
      </div>

      <GlassCard className="p-5 mb-4">
        <p className="text-white/40 mb-3" style={{ fontSize: 12, fontWeight: 600 }}>Wykryte emocje</p>
        <div className="flex flex-wrap gap-2">
          {entry.emotions.map((e) => (
            <EmotionPill key={e} id={e} />
          ))}
        </div>
      </GlassCard>

      <GlassCard
        className="p-5"
        style={{
          background: "linear-gradient(140deg, rgba(167,139,250,0.12), rgba(244,114,182,0.08))",
        }}
      >
        <p className="text-white/40 mb-2" style={{ fontSize: 12, fontWeight: 600 }}>
          Rada oparta na Twoich celach
        </p>
        <p className="text-white/85" style={{ fontSize: 16, lineHeight: 1.6 }}>
          {entry.advice}
        </p>
      </GlassCard>
    </div>
  );
}
