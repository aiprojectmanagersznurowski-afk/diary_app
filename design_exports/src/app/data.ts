// Mock data + shared design tokens for the AI Voice Diary app.
// Backend (Firebase/Zustand) is assumed; this seeds the UI.

export type Emotion = {
  label: string;
  // Tailwind-friendly gradient stops used for pills & charts
  color: string;
  from: string;
  to: string;
};

export const EMOTIONS: Record<string, Emotion> = {
  joy: { label: "Radość", color: "#FDBA74", from: "#FBBF24", to: "#F472B6" },
  calm: { label: "Spokój", color: "#7DD3FC", from: "#38BDF8", to: "#818CF8" },
  stress: { label: "Stres", color: "#FCA5A5", from: "#FB7185", to: "#F87171" },
  gratitude: { label: "Wdzięczność", color: "#C4B5FD", from: "#A78BFA", to: "#F0ABFC" },
  focus: { label: "Skupienie", color: "#93C5FD", from: "#60A5FA", to: "#22D3EE" },
  fatigue: { label: "Zmęczenie", color: "#A5B4FC", from: "#818CF8", to: "#6366F1" },
  hope: { label: "Nadzieja", color: "#F0ABFC", from: "#E879F9", to: "#818CF8" },
};

export type Entry = {
  id: string;
  date: string; // ISO
  title: string;
  summary: string;
  transcription: string;
  emotions: string[]; // keys of EMOTIONS
  advice: string;
};

export const ENTRIES: Entry[] = [
  {
    id: "e1",
    date: "2026-07-01T21:14:00",
    title: "Wtorkowy wieczór",
    summary:
      "Dzień był intensywny w pracy, ale wieczorny spacer pomógł Ci się wyciszyć i złapać perspektywę.",
    transcription:
      "Dzisiaj był naprawdę pełen dzień. Rano miałem trzy spotkania pod rząd i czułem, że nie nadążam. Ale po pracy poszedłem na długi spacer nad rzeką i to całkowicie zmieniło mój nastrój. Zdałem sobie sprawę, że muszę częściej robić sobie takie przerwy. Wieczorem zadzwoniłem do mamy — dawno nie rozmawialiśmy tak długo.",
    emotions: ["stress", "calm", "gratitude"],
    advice:
      "Twój wieczorny spacer wyraźnie obniżył poziom stresu. Skoro Twoim celem jest równowaga, spróbuj zaplanować krótką przerwę na ruch również w środku dnia.",
  },
  {
    id: "e2",
    date: "2026-06-30T22:02:00",
    title: "Poniedziałkowy start",
    summary:
      "Nowy tydzień zaczął się od dużej energii i skupienia — udało Ci się domknąć ważny projekt.",
    transcription:
      "Poniedziałek, ale w dobrym stylu. Skończyłem projekt, nad którym siedziałem od dwóch tygodni. Czułem ogromną ulgę i dumę. Wieczorem trochę zabrakło mi energii, ale ogólnie jestem zadowolony.",
    emotions: ["focus", "joy", "fatigue"],
    advice:
      "Domknięcie projektu to realny krok w stronę Twojego celu zawodowego. Zapisz sobie, co zadziałało — powtarzalne rutyny budują tempo.",
  },
  {
    id: "e3",
    date: "2026-06-29T20:40:00",
    title: "Spokojna niedziela",
    summary:
      "Odpoczynek, książka i czas z rodziną. Dzień pełen wdzięczności i regeneracji.",
    transcription:
      "Cała niedziela zeszła w wolnym tempie. Czytałem, ugotowałem obiad dla rodziny i po prostu byłem obecny. Takie dni ładują mnie na cały tydzień.",
    emotions: ["calm", "gratitude", "hope"],
    advice:
      "Regeneracja jest częścią Twojego celu zdrowotnego. Utrzymuj te wolne niedziele jako świadomy rytuał, nie przypadek.",
  },
  {
    id: "e4",
    date: "2026-06-28T19:12:00",
    title: "Trudna rozmowa",
    summary:
      "Napięta rozmowa wywołała stres, ale zakończyła się szczerym porozumieniem.",
    transcription:
      "Miałem dziś trudną rozmowę z kolegą z zespołu. Na początku było napięcie, ale w końcu udało nam się dogadać. Jestem z siebie dumny, że nie uciekłem od tematu.",
    emotions: ["stress", "hope"],
    advice:
      "Podjęcie trudnej rozmowy to odwaga. Zauważ, że Twój poziom nadziei wzrósł po jej zakończeniu — konfrontacja bywa ulgą.",
  },
];

// Chart data ---------------------------------------------------------------

export const EMOTION_TREND = [
  { day: "Pon", stres: 6, spokoj: 3 },
  { day: "Wt", stres: 7, spokoj: 4 },
  { day: "Śr", stres: 4, spokoj: 6 },
  { day: "Czw", stres: 5, spokoj: 5 },
  { day: "Pt", stres: 3, spokoj: 7 },
  { day: "Sob", stres: 2, spokoj: 8 },
  { day: "Nd", stres: 3, spokoj: 8 },
];

export const ENERGY_TREND = [
  { day: "Pon", energia: 5 },
  { day: "Wt", energia: 4 },
  { day: "Śr", energia: 6 },
  { day: "Czw", energia: 7 },
  { day: "Pt", energia: 6 },
  { day: "Sob", energia: 9 },
  { day: "Nd", energia: 8 },
];

export const SPARKLINE = [4, 6, 5, 7, 6, 9, 8].map((v, i) => ({ i, v }));

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string; // lucide icon name key
  unlocked: boolean;
  from: string;
  to: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", title: "Pierwszy wpis", desc: "Nagrałeś swój pierwszy dzień", icon: "sparkles", unlocked: true, from: "#A78BFA", to: "#F472B6" },
  { id: "a2", title: "Seria 7 dni", desc: "Tydzień bez przerwy", icon: "flame", unlocked: true, from: "#FB7185", to: "#FBBF24" },
  { id: "a3", title: "Nocny myśliciel", desc: "10 wpisów po 22:00", icon: "moon", unlocked: true, from: "#60A5FA", to: "#818CF8" },
  { id: "a4", title: "Wdzięczność", desc: "20 wpisów z wdzięcznością", icon: "heart", unlocked: true, from: "#F0ABFC", to: "#A78BFA" },
  { id: "a5", title: "Mistrz spokoju", desc: "Utrzymaj spokój przez 14 dni", icon: "star", unlocked: false, from: "#38BDF8", to: "#22D3EE" },
  { id: "a6", title: "Energia", desc: "Osiągnij szczyt energii", icon: "zap", unlocked: false, from: "#FBBF24", to: "#F97316" },
  { id: "a7", title: "Refleksja", desc: "100 wpisów łącznie", icon: "book-open", unlocked: false, from: "#A78BFA", to: "#60A5FA" },
  { id: "a8", title: "Legenda", desc: "Seria 100 dni", icon: "crown", unlocked: false, from: "#FBBF24", to: "#F472B6" },
];

export const GOALS = [
  { id: "g1", label: "Zdrowie", value: "Więcej ruchu i lepszy sen" },
  { id: "g2", label: "Kariera", value: "Rozwój w kierunku lidera" },
  { id: "g3", label: "Rodzina", value: "Więcej obecności z bliskimi" },
];
