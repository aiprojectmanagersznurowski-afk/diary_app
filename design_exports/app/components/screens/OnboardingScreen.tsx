import { useState } from "react";
import { Sparkles, Heart, Briefcase, Users } from "lucide-react";
import { motion } from "motion/react";
import { GlassCard, GradientText } from "../ui";

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  const [goals, setGoals] = useState(["", "", ""]);
  const fields = [
    { icon: Heart, ph: "np. Zdrowie i lepszy sen", from: "#F472B6", to: "#FB7185" },
    { icon: Briefcase, ph: "np. Rozwój kariery", from: "#818CF8", to: "#60A5FA" },
    { icon: Users, ph: "np. Więcej czasu z rodziną", from: "#A78BFA", to: "#F0ABFC" },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 pt-20 pb-10 no-scrollbar flex flex-col">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="size-16 rounded-3xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(140deg, #A78BFA, #F472B6, #60A5FA)", boxShadow: "0 0 40px rgba(167,139,250,0.5)" }}>
          <Sparkles size={30} className="text-white" />
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }} className="mb-3">
          Witaj w{" "}
          <GradientText>Twoim Pamiętniku</GradientText>
        </h1>
        <p className="text-white/50 mb-9" style={{ fontSize: 16, lineHeight: 1.5 }}>
          Zdefiniuj swoje 3 główne cele życiowe. AI będzie dopasowywać rady do tego, co dla Ciebie najważniejsze.
        </p>
      </motion.div>

      <div className="space-y-3 flex-1">
        {fields.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <GlassCard className="p-3 flex items-center gap-3">
                <div className="size-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(140deg, ${f.from}, ${f.to})` }}>
                  <Icon size={18} className="text-white" />
                </div>
                <input
                  value={goals[i]}
                  onChange={(e) => {
                    const next = [...goals];
                    next[i] = e.target.value;
                    setGoals(next);
                  }}
                  placeholder={f.ph}
                  className="bg-transparent outline-none flex-1 text-white placeholder:text-white/30"
                  style={{ fontSize: 15 }}
                />
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="w-full mt-8 py-4 rounded-2xl text-white active:scale-[0.98] transition-transform border border-white/20"
        style={{ background: "linear-gradient(120deg, #A78BFA, #F472B6, #60A5FA)", fontSize: 17, fontWeight: 700, boxShadow: "0 10px 40px rgba(244,114,182,0.4)" }}
      >
        Zacznij
      </button>
    </div>
  );
}
