import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore, THEMES } from '../../../application/store/useSettingsStore';

export interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  placeholder?: string;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  isStreaming,
  placeholder = 'Zadaj pytanie swojemu pamiętnikowi...',
}) => {
  const [inputText, setInputText] = useState('');
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const canSend = inputText.trim().length > 0 && !isStreaming;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.tileBorder,
        },
      ]}
    >
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme === 'AppleLight' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.07)',
            borderColor: colors.tileBorder,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
          editable={!isStreaming}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.primary || '#6366F1' : 'transparent',
              opacity: canSend ? 1 : 0.4,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color={colors.primary || '#818CF8'} />
          ) : (
            <Feather name="arrow-up" size={18} color={canSend ? '#FFFFFF' : colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
