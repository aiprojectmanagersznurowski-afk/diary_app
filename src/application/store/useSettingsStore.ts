import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../../domain/models/Profile';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { useAuthStore } from './useAuthStore';

export type ThemeName = 'AppleDark' | 'Sepia' | 'AppleLight';
export type AIPersonality = 'Po prostu przyjaciel' | 'Buddha' | 'Józef Piłsudski' | 'Stefan Banach';

export interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  tileBorder: string;
  tileTint: 'dark' | 'light' | 'default';
  gradientColors: readonly [string, string, ...string[]];
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  AppleDark: {
    background: '#000000',
    text: '#E2E8F0',
    textSecondary: '#94A3B8',
    primary: '#A78BFA',
    tileBorder: 'rgba(255,255,255,0.1)',
    tileTint: 'dark',
    gradientColors: ['#A78BFA', '#F472B6', '#38BDF8'],
  },
  Sepia: {
    background: '#F4ECD8',
    text: '#4A3B32',
    textSecondary: '#7A6B62',
    primary: '#D97757',
    tileBorder: 'rgba(0,0,0,0.1)',
    tileTint: 'light',
    gradientColors: ['#D97757', '#C48A71', '#8C5A46'],
  },
  AppleLight: {
    background: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    primary: '#007AFF',
    tileBorder: 'rgba(0,0,0,0.05)',
    tileTint: 'light',
    gradientColors: ['#007AFF', '#5856D6', '#FF2D55'],
  },
};

interface SettingsState {
  lifeGoals: string[];
  theme: ThemeName;
  aiPersonality: AIPersonality;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setGoals: (goals: string[]) => void;
  addGoal: (goal: string) => void;
  removeGoal: (goal: string) => void;
  clearGoals: () => void;
  setTheme: (theme: ThemeName) => void;
  setAIPersonality: (personality: AIPersonality) => void;
  applyProfile: (profile: Partial<Profile>) => void;
  syncGoalsFromCloud: (targetUserId?: string) => Promise<void>;
  resetSettings: () => void;
}

let activeProfileRepository: IProfileRepository | null = null;

export const setProfileRepository = (repo: IProfileRepository | null) => {
  activeProfileRepository = repo;
};

const syncProfileToCloud = (dataToSync: Partial<Profile>) => {
  if (!activeProfileRepository) return;
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  activeProfileRepository
    .upsertProfile({
      userId,
      ...dataToSync,
    })
    .catch((error) => {
      console.warn('Failed to sync profile to Supabase', error);
    });
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lifeGoals: [],
      theme: 'AppleDark',
      aiPersonality: 'Po prostu przyjaciel',
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setGoals: (goals) => {
        set({ lifeGoals: goals });
        syncProfileToCloud({ lifeGoals: goals });
      },
      addGoal: (goal) => {
        set((state) => {
          const newGoals = [...state.lifeGoals, goal];
          syncProfileToCloud({ lifeGoals: newGoals });
          return { lifeGoals: newGoals };
        });
      },
      removeGoal: (goal) => {
        set((state) => {
          const newGoals = state.lifeGoals.filter((g) => g !== goal);
          syncProfileToCloud({ lifeGoals: newGoals });
          return { lifeGoals: newGoals };
        });
      },
      clearGoals: () => {
        set({ lifeGoals: [] });
        syncProfileToCloud({ lifeGoals: [] });
      },
      setTheme: (theme) => {
        set({ theme });
        syncProfileToCloud({ theme });
      },
      setAIPersonality: (aiPersonality) => {
        set({ aiPersonality });
        syncProfileToCloud({ aiPersonality });
      },
      applyProfile: (profile) => {
        set((state) => ({
          lifeGoals: profile.lifeGoals !== undefined ? profile.lifeGoals : state.lifeGoals,
          theme: (profile.theme as ThemeName) || state.theme,
          aiPersonality: (profile.aiPersonality as AIPersonality) || state.aiPersonality,
        }));
      },
      syncGoalsFromCloud: async (targetUserId?: string) => {
        if (!activeProfileRepository) return;
        const userId = targetUserId || useAuthStore.getState().user?.id;
        if (!userId) return;

        try {
          const profile = await activeProfileRepository.getProfile(userId);
          if (profile) {
            set((state) => ({
              lifeGoals: profile.lifeGoals ?? state.lifeGoals,
              theme: (profile.theme as ThemeName) || state.theme,
              aiPersonality: (profile.aiPersonality as AIPersonality) || state.aiPersonality,
            }));
          }
        } catch (error) {
          console.warn('Failed to fetch profile from Supabase', error);
        }
      },
      resetSettings: () => {
        set({
          lifeGoals: [],
          theme: 'AppleDark',
          aiPersonality: 'Po prostu przyjaciel',
        });
        AsyncStorage.removeItem('settings-storage').catch(() => {});
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
