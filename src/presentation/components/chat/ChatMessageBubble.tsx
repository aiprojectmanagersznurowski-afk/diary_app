import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { ChatMessage, Citation } from '../../../domain/models/Chat';
import { useSettingsStore, THEMES } from '../../../application/store/useSettingsStore';

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  onCitationPress?: (documentId: string) => void;
}

const DOC_PATTERN = /(\[doc:[a-zA-Z0-9_-]+\])/g;

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, onCitationPress }) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const isUser = message.role === 'user';

  // Słownik cytatów po documentId
  const citationsMap = new Map<string, Citation>();
  for (const c of message.citations || []) {
    citationsMap.set(c.documentId, c);
  }

  const renderContentWithCitations = (content: string) => {
    const parts = content.split(DOC_PATTERN);

    return parts.map((part, index) => {
      const match = part.match(/^\[doc:([a-zA-Z0-9_-]+)\]$/);
      if (match) {
        const docId = match[1];
        const citation = citationsMap.get(docId);
        const title = citation?.title || 'Notatka';

        return (
          <TouchableOpacity
            key={`citation-${index}`}
            style={[
              styles.inlineCitation,
              {
                backgroundColor: theme === 'AppleLight' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(129, 140, 248, 0.2)',
                borderColor: theme === 'AppleLight' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(129, 140, 248, 0.4)',
              },
            ]}
            onPress={() => onCitationPress?.(docId)}
            activeOpacity={0.7}
          >
            <Feather name="file-text" size={11} color={colors.primary || '#818CF8'} />
            <Text style={[styles.inlineCitationText, { color: colors.primary || '#818CF8' }]} numberOfLines={1}>
              {title}
            </Text>
          </TouchableOpacity>
        );
      }

      return (
        <Text key={`text-${index}`} style={[styles.messageText, { color: isUser ? '#FFFFFF' : colors.text }]}>
          {part}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Ionicons name="sparkles" size={13} color="#A855F7" />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary || '#6366F1' }]
            : [
                styles.assistantBubble,
                {
                  backgroundColor: theme === 'AppleLight' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: colors.tileBorder,
                },
              ],
        ]}
      >
        <View style={styles.contentRow}>{renderContentWithCitations(message.content)}</View>

        {/* Lista załączonych źródeł na dole wypowiedzi asystenta */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <View style={[styles.sourcesContainer, { borderTopColor: colors.tileBorder }]}>
            <Text style={[styles.sourcesHeader, { color: colors.textSecondary }]}>Źródła:</Text>
            <View style={styles.sourcesList}>
              {message.citations.map((c) => (
                <TouchableOpacity
                  key={`source-${c.documentId}`}
                  style={[
                    styles.sourcePill,
                    {
                      backgroundColor: theme === 'AppleLight' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                      borderColor: colors.tileBorder,
                    },
                  ]}
                  onPress={() => onCitationPress?.(c.documentId)}
                  activeOpacity={0.7}
                >
                  <Feather name="file-text" size={11} color={colors.primary || '#818CF8'} />
                  <Text style={[styles.sourcePillText, { color: colors.text }]} numberOfLines={1}>
                    {c.title}
                  </Text>
                  {c.day && <Text style={[styles.sourcePillDate, { color: colors.textSecondary }]}>{c.day}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  inlineCitation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 3,
    marginVertical: 1,
  },
  inlineCitationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    maxWidth: 140,
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  sourcesHeader: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    marginRight: 4,
    flexShrink: 1,
  },
  sourcePillDate: {
    fontSize: 11,
  },
});
