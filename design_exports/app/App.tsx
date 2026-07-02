import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Aurora } from "./components/ui";
import { OnboardingScreen } from "./components/screens/OnboardingScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { EntryDetailScreen } from "./components/screens/EntryDetailScreen";
import { AnalyticsScreen } from "./components/screens/AnalyticsScreen";
import { AchievementsScreen } from "./components/screens/AchievementsScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { RecordingOverlay } from "./components/screens/RecordingOverlay";

type Screen = "onboarding" | "home" | "detail" | "analytics" | "achievements" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [entryId, setEntryId] = useState<string>("e1");
  const [recording, setRecording] = useState(false);

  const go = (s: Screen) => setScreen(s);

  return (
    <div className="size-full flex items-center justify-center bg-neutral-900 p-4" style={{ fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* iPhone frame */}
      <div
        className="relative overflow-hidden text-white select-none"
        style={{
          width: 390,
          height: 844,
          maxHeight: "calc(100vh - 32px)",
          aspectRatio: "390 / 844",
          borderRadius: 52,
          background: "#000000",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), inset 0 0 0 8px #0a0a0a",
        }}
      >
        <Aurora />

        {/* Dynamic island */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 h-7 w-28 rounded-full bg-black" />

        {/* Screens */}
        <div className="relative z-10 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {screen === "onboarding" && <OnboardingScreen onStart={() => go("home")} />}
              {screen === "home" && (
                <HomeScreen
                  onOpenEntry={(id) => { setEntryId(id); go("detail"); }}
                  onNav={(s) => go(s as Screen)}
                  onRecord={() => setRecording(true)}
                />
              )}
              {screen === "detail" && <EntryDetailScreen id={entryId} onBack={() => go("home")} />}
              {screen === "analytics" && <AnalyticsScreen onBack={() => go("home")} />}
              {screen === "achievements" && <AchievementsScreen onBack={() => go("home")} />}
              {screen === "settings" && (
                <SettingsScreen onBack={() => go("home")} onLogout={() => go("onboarding")} />
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {recording && <RecordingOverlay onClose={() => setRecording(false)} />}
          </AnimatePresence>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 h-1 w-32 rounded-full bg-white/30" />
      </div>
    </div>
  );
}
