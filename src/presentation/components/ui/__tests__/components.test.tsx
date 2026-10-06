import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { useSettingsStore, THEMES } from '../../../../application/store/useSettingsStore';
import { Chip, EmotionPill, NoteTypeChip, PrimaryButton, SegmentedControl, StatusChip, GlassCard } from '..';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather', Ionicons: 'Ionicons' }));

function flatStyle(node: any) {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function render(element: React.ReactElement) {
  let tree: any;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

function textOf(tree: any): string[] {
  return tree.root.findAllByType('Text' as never).map((t: any) => ([] as unknown[]).concat(t.props.children).join(''));
}

beforeEach(() => {
  act(() => {
    useSettingsStore.setState({ theme: 'AppleDark' });
  });
});

describe('prymitywy UI czytają kolory z motywu', () => {
  it('Chip: aktywny ma tło primary i tekst onPrimary, nieaktywny card2', () => {
    const on = render(<Chip label="Pomysły" selected onPress={() => {}} />);
    const off = render(<Chip label="Zadania" onPress={() => {}} />);
    const onPressable = on.root.findByProps({ accessibilityRole: 'button' });
    const offPressable = off.root.findByProps({ accessibilityRole: 'button' });

    expect(flatStyle(onPressable).backgroundColor).toBe(THEMES.AppleDark.primary);
    expect(flatStyle(offPressable).backgroundColor).toBe(THEMES.AppleDark.card2);
  });

  it('Chip: zmiana motywu przemalowuje komponent bez ponownego montowania', () => {
    const tree = render(<Chip label="Wszystkie" selected onPress={() => {}} />);
    const pressable = () => tree.root.findByProps({ accessibilityRole: 'button' });
    expect(flatStyle(pressable()).backgroundColor).toBe(THEMES.AppleDark.primary);

    act(() => {
      useSettingsStore.setState({ theme: 'Sepia' });
    });
    expect(flatStyle(pressable()).backgroundColor).toBe(THEMES.Sepia.primary);

    act(() => {
      useSettingsStore.setState({ theme: 'AppleLight' });
    });
    expect(flatStyle(pressable()).backgroundColor).toBe(THEMES.AppleLight.primary);
  });

  it('Chip: wywołuje onPress', () => {
    const onPress = jest.fn();
    const tree = render(<Chip label="Wydarzenia" onPress={onPress} />);
    act(() => {
      tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('PrimaryButton: tło primary, tekst onPrimary; wyłączony nie reaguje', () => {
    const onPress = jest.fn();
    const tree = render(<PrimaryButton label="Zaczynamy" onPress={onPress} />);
    const button = tree.root.findByProps({ accessibilityRole: 'button' });
    const style = StyleSheet.flatten(button.props.style({ pressed: false }));
    expect(style.backgroundColor).toBe(THEMES.AppleDark.primary);
    expect(textOf(tree)).toContain('Zaczynamy');

    const disabled = render(<PrimaryButton label="Zaczynamy" onPress={onPress} disabled />);
    expect(disabled.root.findByProps({ accessibilityRole: 'button' }).props.disabled).toBe(true);
  });

  it('SegmentedControl: zaznacza aktywny segment i zgłasza zmianę', () => {
    const onChange = jest.fn();
    const tree = render(
      <SegmentedControl
        options={[
          { key: 'entries', label: 'Wpisy dnia' },
          { key: 'notes', label: 'Notatki (3)' },
        ]}
        value="entries"
        onChange={onChange}
      />,
    );
    const buttons = tree.root.findAll(
      (n: any) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function',
    );
    expect(buttons[0].props.accessibilityState).toEqual({ selected: true });
    expect(buttons[1].props.accessibilityState).toEqual({ selected: false });
    act(() => {
      buttons[1].props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('notes');
  });

  it('EmotionPill: kolor tła z emocji, ciemny tekst', () => {
    const tree = render(<EmotionPill id="Spokój" trigger="spacer" />);
    expect(textOf(tree)).toContain('Spokój: spacer');
    const views = tree.root.findAllByType('View' as never);
    expect(views.some((v: any) => flatStyle(v).backgroundColor === '#7DD3FC')).toBe(true);
  });

  it('NoteTypeChip: etykieta typu po polsku', () => {
    expect(textOf(render(<NoteTypeChip type="idea" />))).toContain('Pomysł');
    expect(textOf(render(<NoteTypeChip type="task" />))).toContain('Zadanie');
    expect(textOf(render(<NoteTypeChip type="reflection" />))).toContain('Refleksja');
    expect(textOf(render(<NoteTypeChip type="event" />))).toContain('Wydarzenie');
  });

  it('StatusChip: kolor statusu i etykieta', () => {
    const tree = render(<StatusChip stage="done" label="Gotowe" />);
    expect(textOf(tree)).toContain('Gotowe');
    const animated = tree.root.findAll((n: any) => flatStyle(n).backgroundColor === '#34D399');
    expect(animated.length).toBeGreaterThan(0);
  });

  it('GlassCard: obramowanie i tło karty z motywu; zmiana motywu je zmienia', () => {
    const tree = render(<GlassCard>{null}</GlassCard>);
    const wrapper = () => tree.root.findAll((n: any) => flatStyle(n).borderRadius === 22)[0];
    expect(flatStyle(wrapper()).backgroundColor).toBe(THEMES.AppleDark.card);
    expect(flatStyle(wrapper()).borderColor).toBe(THEMES.AppleDark.border);

    act(() => {
      useSettingsStore.setState({ theme: 'AppleLight' });
    });
    expect(flatStyle(wrapper()).backgroundColor).toBe(THEMES.AppleLight.card);
    expect(flatStyle(wrapper()).borderColor).toBe(THEMES.AppleLight.border);
  });
});
