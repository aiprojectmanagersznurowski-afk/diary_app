import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ACCENTS, PrimaryButton, WHITE, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { formatLongDate } from '../home/homeLogic';
import { StoryBlock } from './detailLogic';
import {
  STORY_CLOSE_BG,
  STORY_EXPORT_HEIGHT,
  STORY_EXPORT_WIDTH,
  STORY_FOOT_LINE,
  STORY_HEIGHT,
  STORY_SHADOW,
  STORY_VEIL,
  STORY_WIDTH,
} from './tokens';

/** Opóźnienie przed zrobieniem zdjęcia karty, żeby widok zdążył się wyrenderować. */
const CAPTURE_DELAY_MS = 350;

interface StoryPreviewProps {
  visible: boolean;
  day: string;
  blocks: StoryBlock[];
  /** Zamknięcie podglądu (X albo po zakończeniu udostępniania). */
  onClose: () => void;
}

/**
 * Podgląd story 9:16: karta z gradientem motywu i wybranymi sekcjami. Po otwarciu karta jest renderowana do
 * obrazu (react-native-view-shot) i otwiera się systemowy arkusz udostępniania (expo-sharing).
 */
export const StoryPreview: React.FC<StoryPreviewProps> = ({ visible, day, blocks, onClose }) => {
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = useCallback(async () => {
    setError(null);
    setIsSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError(pl.detail.share.unavailable);
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: STORY_EXPORT_WIDTH,
        height: STORY_EXPORT_HEIGHT,
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSharing(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => void share(), CAPTURE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, share]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.veil, { backgroundColor: STORY_VEIL }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={pl.detail.a11y.closeStory}
          style={[styles.close, { backgroundColor: STORY_CLOSE_BG }]}
        >
          <Feather name="x" size={18} color={WHITE} />
        </Pressable>

        <View ref={cardRef} collapsable={false} style={styles.cardShadow}>
          <LinearGradient
            colors={colors.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.35, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.date}>{formatLongDate(day)}</Text>
            <View style={styles.body}>
              {blocks.map((block) => (
                <View key={block.key}>
                  <Text style={styles.label}>{block.label}</Text>
                  <Text style={block.big ? styles.big : styles.text} numberOfLines={block.big ? 5 : 4}>
                    {block.text}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[styles.footer, { borderTopColor: STORY_FOOT_LINE }]}>{pl.detail.share.footer}</Text>
          </LinearGradient>
        </View>

        <View style={styles.actions}>
          {isSharing ? <ActivityIndicator color={WHITE} /> : null}
          {error ? <Text style={[styles.error, { color: ACCENTS.error }]}>{error}</Text> : null}
          <PrimaryButton label={pl.detail.a11y.share} onPress={() => void share()} loading={isSharing} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  veil: { flex: 1, alignItems: 'center', paddingTop: 80 },
  close: {
    position: 'absolute',
    top: 64,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  cardShadow: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    borderRadius: 24,
    shadowColor: STORY_SHADOW,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 12,
    overflow: 'hidden',
  },
  date: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  body: { flex: 1, gap: 12, overflow: 'hidden' },
  label: {
    color: WHITE,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.75,
    marginBottom: 3,
  },
  text: { color: WHITE, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  big: { color: WHITE, fontSize: 19, lineHeight: 23, fontWeight: '800', letterSpacing: -0.4 },
  footer: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
    textAlign: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actions: { position: 'absolute', left: 24, right: 24, bottom: 40, gap: 10 },
  error: { fontSize: 13, textAlign: 'center' },
});
