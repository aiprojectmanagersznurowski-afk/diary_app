import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassCard, useTheme } from '../ui';
import { KNOWN_CONTEXT_FILES, UserContextFile } from '../../../domain/models/UserContextFile';
import { IUserContextRepository } from '../../../domain/repositories/IUserContextRepository';
import { useAuthStore } from '../../../application/store/useAuthStore';
import { pl } from '../../i18n/pl';

interface UserContextFilesCardProps {
  repository: IUserContextRepository;
}

export const UserContextFilesCard: React.FC<UserContextFilesCardProps> = ({ repository }) => {
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);

  const [files, setFiles] = useState<Record<string, UserContextFile>>({});
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFiles = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await repository.getContextFiles(userId);
      const map: Record<string, UserContextFile> = {};
      list.forEach((f) => {
        map[f.filename] = f;
      });
      setFiles(map);
    } catch (err) {
      console.warn('Błąd ładowania plików kontekstu:', err);
    } finally {
      setLoading(false);
    }
  }, [repository, userId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSelectFile = (filename: string) => {
    if (selectedFilename === filename) {
      setSelectedFilename(null);
      setIsEditing(false);
      return;
    }
    setSelectedFilename(filename);
    const existing = files[filename];
    setEditingContent(existing?.content || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!userId || !selectedFilename) return;
    setSaving(true);
    try {
      await repository.saveContextFile(userId, selectedFilename, editingContent);
      setFiles((prev) => ({
        ...prev,
        [selectedFilename]: {
          userId,
          filename: selectedFilename,
          content: editingContent,
          version: (prev[selectedFilename]?.version || 0) + 1,
        },
      }));
      setIsEditing(false);
      Alert.alert('Sukces', pl.settings.contextFilesSaved);
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać pliku.');
    } finally {
      setSaving(false);
    }
  };

  const handleForget = (filename: string) => {
    Alert.alert(
      'Zapomnieć tę wiedzę?',
      `Czy na pewno chcesz usunąć plik ${filename}? Model przestanie go uwzględniać w swoich odpowiedziach.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zapomnij to',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              await repository.deleteContextFile(userId, filename);
              setFiles((prev) => {
                const next = { ...prev };
                delete next[filename];
                return next;
              });
              if (selectedFilename === filename) {
                setSelectedFilename(null);
                setIsEditing(false);
              }
            } catch {
              Alert.alert('Błąd', 'Nie udało się usunąć pliku.');
            }
          },
        },
      ],
    );
  };

  return (
    <GlassCard padding={16} style={styles.card}>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{pl.settings.contextFilesSubtitle}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.filesList}>
          {KNOWN_CONTEXT_FILES.map((def) => {
            const file = files[def.filename];
            const hasContent = Boolean(file?.content && file.content.trim().length > 0);
            const isSelected = selectedFilename === def.filename;

            return (
              <View key={def.filename} style={[styles.fileItem, { borderColor: colors.border }]}>
                <Pressable
                  onPress={() => handleSelectFile(def.filename)}
                  style={styles.fileHeader}
                  accessibilityRole="button"
                >
                  <View style={styles.fileHeaderInfo}>
                    <View style={styles.fileBadgeRow}>
                      <Text style={[styles.filename, { color: colors.primary }]}>{def.filename}</Text>
                      {hasContent ? (
                        <View style={[styles.statusBadge, { backgroundColor: colors.segOn }]}>
                          <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                            Aktywny (v{file?.version})
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: colors.card2 }]}>
                          <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>Pusty</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.fileTitle, { color: colors.text }]}>{def.title}</Text>
                    <Text style={[styles.fileDesc, { color: colors.textSecondary }]}>{def.desc}</Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>{isSelected ? '▲' : '▼'}</Text>
                </Pressable>

                {isSelected ? (
                  <View style={[styles.fileDetails, { borderTopColor: colors.border }]}>
                    {isEditing ? (
                      <View>
                        <TextInput
                          multiline
                          value={editingContent}
                          onChangeText={setEditingContent}
                          placeholder="# Wpisz treść w formacie Markdown..."
                          placeholderTextColor={colors.textSecondary}
                          style={[
                            styles.editorInput,
                            {
                              color: colors.text,
                              backgroundColor: colors.card2,
                              borderColor: colors.border,
                            },
                          ]}
                        />
                        <View style={styles.actionButtonsRow}>
                          <Pressable
                            onPress={() => setIsEditing(false)}
                            style={[styles.smallBtn, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.smallBtnText, { color: colors.text }]}>Anuluj</Text>
                          </Pressable>
                          <Pressable
                            onPress={handleSave}
                            disabled={saving}
                            style={[styles.smallBtnPrimary, { backgroundColor: colors.primary }]}
                          >
                            <Text style={[styles.smallBtnPrimaryText, { color: colors.onPrimary }]}>
                              {saving ? 'Zapisuję...' : 'Zapisz'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View>
                        <View
                          style={[styles.previewBox, { backgroundColor: colors.card2, borderColor: colors.border }]}
                        >
                          <Text style={[styles.previewContent, { color: colors.text }]}>
                            {file?.content ? file.content : 'Ten plik jest obecnie pusty.'}
                          </Text>
                        </View>

                        <View style={styles.actionButtonsRow}>
                          <Pressable
                            onPress={() => {
                              setEditingContent(file?.content || '');
                              setIsEditing(true);
                            }}
                            style={[styles.smallBtn, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.smallBtnText, { color: colors.text }]}>Edytuj</Text>
                          </Pressable>

                          {hasContent ? (
                            <Pressable
                              onPress={() => handleForget(def.filename)}
                              style={[styles.smallBtnDanger, { borderColor: colors.border }]}
                            >
                              <Text style={[styles.smallBtnDangerText, { color: colors.textSecondary }]}>
                                Zapomnij to
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  filesList: {
    gap: 10,
  },
  fileItem: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  fileHeaderInfo: {
    flex: 1,
    paddingRight: 10,
  },
  fileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  filename: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    fontSize: 12,
  },
  fileDetails: {
    borderTopWidth: 1,
    padding: 12,
  },
  editorInput: {
    minHeight: 120,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  previewBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallBtnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallBtnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallBtnDangerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
