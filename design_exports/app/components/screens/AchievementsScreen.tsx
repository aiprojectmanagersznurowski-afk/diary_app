import { ChevronLeft, Lock, Sparkles, Flame, Moon, Heart, Star, Zap, BookOpen, Crown } from "lucide-react";
import { motion } from "motion/react";
import { ACHIEVEMENTS } from "../../data";
import { GlassCard, GradientText } from "../ui";

const ICONS: Record<string, any> = {
  sparkles: Sparkles,
  flame: Flame,
  moon: Moon,
  heart: Heart,
  star: Star,
  zap: Zap,
  "book-open": BookOpen,
  crown: Crown,
};

export function AchievementsScreen({ onBack }: { onBack: () => void }) {
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
          <GradientText>Osiągnięcia</GradientText>
        </h1>
      </div>

      {/* Streak banner */}
      <GlassCard
        className="p-5 mb-6 flex items-center gap-4"
        style={{ background: "linear-gradient(120deg, rgba(251,113,133,0.15), rgba(251,191,36,0.12))" }}
      >
        <div className="size-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(140deg, #FB7185, #FBBF24)" }}>
          <Flame size={26} className="text-white" />
        </div>
        <div>
          <p className="text-white/50" style={{ fontSize: 12 }}>Aktualna seria</p>
          <p style={{ fontSize: 24, fontWeight: 800 }}>
            <GradientText from="#FBBF24" via="#FB7185" to="#F472B6">7 dni 🔥</GradientText>
          </p>
        </div>
      </GlassCard>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a, i) => {
          const Icon = ICONS[a.icon] ?? Star;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className={`p-4 h-full ${a.unlocked ? "" : "opacity-45"}`}>
                <div className="relative mb-3">
                  <div
                    className="size-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: a.unlocked
                        ? `linear-gradient(140deg, ${a.from}, ${a.to})`
                        : "rgba(255,255,255,0.08)",
                      boxShadow: a.unlocked ? `0 0 22px ${a.from}66` : "none",
                    }}
                  >
                    {a.unlocked ? (
                      <Icon size={22} className="text-white" />
                    ) : (
                      <Lock size={20} className="text-white/60" />
                    )}
                  </div>
                </div>
                <p className="text-white/90" style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</p>
                <p className="text-white/45 mt-0.5" style={{ fontSize: 12, lineHeight: 1.4 }}>{a.desc}</p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
