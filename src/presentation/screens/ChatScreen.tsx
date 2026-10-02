import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { useChatStore } from '../../application/store/useChatStore';
import { ChatMessageBubble, ChatInputBar, QuickQuestions } from '../components/chat';
import { ChatMessage } from '../../domain/models/Chat';

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const flatListRef = useRef<FlatList<any>>(null);

  const {
    activeThreadId,
    threads,
    messages,
    isStreaming,
    streamingContent,
    isLoadingMessages,
    error,
    loadThreads,
    selectThread,
    startNewThread,
    sendMessage,
    clearError,
  } = useChatStore();

  useEffect(() => {
    loadThreads();
    const routeThreadId = route.params?.threadId;
    if (routeThreadId) {
      selectThread(routeThreadId);
    }
  }, [route.params?.threadId, loadThreads, selectThread]);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const titleText = activeThread?.title || 'Czat z pamiętnikiem';

  const handleCitationPress = (documentId: string) => {
    navigation.navigate('Detail', { entryId: documentId });
  };

  const handleSend = (text: string) => {
    sendMessage(text);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  // Wiadomość asystenta w trakcie strumieniowania
  const streamingMessage: ChatMessage | null = isStreaming
    ? {
        id: 'streaming-assistant',
        threadId: activeThreadId || 'current',
        userId: 'assistant',
        role: 'assistant',
        content: streamingContent || '...',
        citations: [],
        createdAt: new Date().toISOString(),
      }
    : null;

  const displayMessages = streamingMessage ? [...messages, streamingMessage] : messages;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.tileBorder,
            backgroundColor: theme === 'AppleLight' ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.headerButton,
            {
              backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
            },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {titleText}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isStreaming ? 'Odpowiadam...' : 'Asystent RAG'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.headerButton,
            {
              backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
            },
          ]}
          onPress={() => startNewThread()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Nowy czat"
        >
          <Feather name="edit-3" size={18} color={colors.primary || '#818CF8'} />
        </TouchableOpacity>
      </View>

      {/* Komunikat o błędzie */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
            <Feather name="x" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Główna lista wiadomości */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoadingMessages ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#818CF8'} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Ładowanie rozmowy...</Text>
          </View>
        ) : displayMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="message-square" size={32} color="#A855F7" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Czat z Twoim pamiętnikiem</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Zadaj pytanie o swoje notatki, pomysły z konkretnego dnia, zrobione zadania lub nastrój.
            </Text>
            <View style={styles.emptyQuestions}>
              <QuickQuestions onSelectQuestion={handleQuickQuestion} />
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatMessageBubble message={item} onCitationPress={handleCitationPress} />}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Dolny pasek wpisywania wiadomości */}
        <ChatInputBar onSendMessage={handleSend} isStreaming={isStreaming} />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyQuestions: {
    width: '100%',
  },
  errorBanner: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    marginLeft: 8,
    padding: 4,
  },
});
