import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { GradientText } from "../ui";

export function RecordingOverlay({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}
    >
      <p className="text-white/50 mb-2" style={{ fontSize: 14 }}>Nagrywanie...</p>
      <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: 1 }} className="mb-10">
        <GradientText>{mm}:{ss}</GradientText>
      </p>

      {/* Waveform */}
      <div className="flex items-end gap-1.5 h-24 mb-14">
        {Array.from({ length: 22 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1.5 rounded-full"
            style={{ background: "linear-gradient(180deg, #A78BFA, #F472B6)" }}
            animate={{ height: [8, 20 + ((i * 13) % 60), 8] }}
            transition={{ duration: 0.8 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="flex items-center gap-10">
        <button
          onClick={onClose}
          className="size-14 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center active:scale-90 transition-transform"
        >
          <X size={22} className="text-white/70" />
        </button>
        <button
          onClick={onClose}
          className="size-16 rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-transform"
          style={{ background: "linear-gradient(140deg, #A78BFA, #F472B6, #60A5FA)", boxShadow: "0 0 40px rgba(244,114,182,0.5)" }}
        >
          <Check size={28} className="text-white" />
        </button>
      </div>
    </motion.div>
  );
}
