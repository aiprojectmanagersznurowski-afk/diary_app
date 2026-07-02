import { Trophy, Settings, TrendingUp, Mic } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { ENTRIES, SPARKLINE } from "../../data";
import { GlassCard, GradientText, EmotionPill, formatDate } from "../ui";

export function HomeScreen({
  onOpenEntry,
  onNav,
  onRecord,
}: {
  onOpenEntry: (id: string) => void;
  onNav: (s: string) => void;
  onRecord: () => void;
}) {
  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto px-5 pt-16 pb-40 no-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/40" style={{ fontSize: 13 }}>Witaj ponownie</p>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>
              <GradientText>Mój Pamiętnik</GradientText>
            </h1>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onNav("achievements")}
              className="size-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <Trophy size={18} className="text-amber-300" />
            </button>
            <button
              onClick={() => onNav("settings")}
              className="size-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <Settings size={18} className="text-white/70" />
            </button>
          </div>
        </div>

        {/* Analytics banner */}
        <GlassCard onClick={() => onNav("analytics")} className="p-4 mb-7 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={15} className="text-fuchsia-300" />
                <span className="text-white/50" style={{ fontSize: 12 }}>Podsumowanie Tygodnia</span>
              </div>
              <p style={{ fontSize: 17, fontWeight: 600 }} className="text-white">
                Twój spokój wzrósł o{" "}
                <GradientText from="#38BDF8" via="#818CF8" to="#F472B6">42%</GradientText>
              </p>
              <p className="text-white/40 mt-0.5" style={{ fontSize: 12 }}>Zobacz Weekly Insights →</p>
            </div>
            <div className="w-24 h-14">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SPARKLINE}>
                  <defs>
                    <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="url(#spark)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Feed */}
        <p className="text-white/40 mb-3 px-1" style={{ fontSize: 13, fontWeight: 600 }}>Ostatnie wpisy</p>
        <div className="space-y-3">
          {ENTRIES.map((entry, i) => {
            const d = formatDate(entry.date);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassCard onClick={() => onOpenEntry(entry.id)} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/90" style={{ fontSize: 15, fontWeight: 600 }}>
                      {d.full}
                    </span>
                    <span className="text-white/35" style={{ fontSize: 12 }}>{d.time}</span>
                  </div>
                  <p className="text-white/60 mb-3" style={{ fontSize: 14, lineHeight: 1.45 }}>
                    {entry.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.emotions.map((e) => (
                      <EmotionPill key={e} id={e} />
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <motion.button
          onClick={onRecord}
          whileTap={{ scale: 0.9 }}
          animate={{ boxShadow: ["0 0 30px 4px rgba(167,139,250,0.5)", "0 0 46px 10px rgba(244,114,182,0.55)", "0 0 30px 4px rgba(167,139,250,0.5)"] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="size-[68px] rounded-full flex items-center justify-center border border-white/20"
          style={{ background: "linear-gradient(140deg, #A78BFA, #F472B6, #60A5FA)" }}
        >
          <Mic size={28} className="text-white" />
        </motion.button>
      </div>
    </div>
  );
}
