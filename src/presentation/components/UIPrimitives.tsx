/**
 * Zgodność wsteczna: prymitywy UI przeniesione do `components/ui/` (Faza 8, docs/08-design-ui.md).
 * Ekrany jeszcze nieprzepisane na nowy wygląd importują stąd; nowy kod importuje z `./ui`.
 */
export { GlassCard, GradientText, EmotionPill, AuroraBackground, EMOTIONS } from './ui';
export type { Emotion } from './ui';
