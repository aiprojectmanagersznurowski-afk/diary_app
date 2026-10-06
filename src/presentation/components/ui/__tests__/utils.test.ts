import { parseColor, withAlpha } from '../colorUtils';
import { formatTimer } from '../format';
import { resolveEmotion, EMOTIONS, NOTE_TYPE_STYLE, STATUS_STYLE } from '../tokens';

describe('parseColor', () => {
  it('rozbija rgba na kolor i alfę', () => {
    expect(parseColor('rgba(167,139,250,0.50)')).toEqual({ rgb: 'rgb(167,139,250)', alpha: 0.5 });
  });

  it('zwraca kolor z alfą 1 dla innych formatów', () => {
    expect(parseColor('#A78BFA')).toEqual({ rgb: '#A78BFA', alpha: 1 });
  });
});

describe('withAlpha', () => {
  it('dodaje alfę do koloru hex (18% ≈ 2E)', () => {
    expect(withAlpha('#FBBF24', 0.18)).toBe('#FBBF242e');
  });

  it('nie zmienia wartości, która nie jest #RRGGBB', () => {
    expect(withAlpha('rgba(0,0,0,0.5)', 0.2)).toBe('rgba(0,0,0,0.5)');
  });
});

describe('formatTimer', () => {
  it.each([
    [0, '00:00'],
    [9, '00:09'],
    [65, '01:05'],
    [3599, '59:59'],
    [-5, '00:00'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatTimer(seconds)).toBe(expected);
  });
});

describe('resolveEmotion', () => {
  it('dopasowuje polskie nazwy emocji niezależnie od wielkości liter i emoji', () => {
    expect(resolveEmotion('Spokój')).toBe(EMOTIONS.calm);
    expect(resolveEmotion('😊 radość')).toBe(EMOTIONS.joy);
    expect(resolveEmotion('Zmęczenie')).toBe(EMOTIONS.fatigue);
    expect(resolveEmotion('Wdzięczność')).toBe(EMOTIONS.gratitude);
  });

  it('dopasowuje angielskie klucze i domyślnie zwraca Radość', () => {
    expect(resolveEmotion('stress')).toBe(EMOTIONS.stress);
    expect(resolveEmotion('coś zupełnie innego')).toBe(EMOTIONS.joy);
  });
});

describe('stałe semantyczne z briefu §1.2', () => {
  it('typy notatek mają kolory i ikony z briefu', () => {
    expect(NOTE_TYPE_STYLE.idea).toMatchObject({ color: '#FBBF24', icon: 'zap' });
    expect(NOTE_TYPE_STYLE.task).toMatchObject({ color: '#60A5FA', icon: 'check-square' });
    expect(NOTE_TYPE_STYLE.reflection).toMatchObject({ color: '#F0ABFC', icon: 'feather' });
    expect(NOTE_TYPE_STYLE.event).toMatchObject({ color: '#38BDF8', icon: 'calendar' });
  });

  it('statusy w toku pulsują, końcowe i kolejka nie', () => {
    expect(STATUS_STYLE.uploaded.pulse).toBe(true);
    expect(STATUS_STYLE.processing.pulse).toBe(true);
    expect(STATUS_STYLE.queued.pulse).toBe(false);
    expect(STATUS_STYLE.done.pulse).toBe(false);
    expect(STATUS_STYLE.failed.pulse).toBe(false);
    expect(STATUS_STYLE.done.color).toBe('#34D399');
    expect(STATUS_STYLE.failed.color).toBe('#F87171');
  });
});
