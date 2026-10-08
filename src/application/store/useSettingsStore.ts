import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../../domain/models/Profile';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { useAuthStore } from './useAuthStore';

export type ThemeName = 'AppleDark' | 'Sepia' | 'AppleLight';
export type AIPersonality =
  'Po prostu przyjaciel' | 'Buddha' | 'Józef Piłsudski' | 'Stefan Banach' | 'David Deida' | 'Andrew Huberman';

export interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  tileBorder: string;
  tileTint: 'dark' | 'light' | 'default';
  gradientColors: readonly [string, string, ...string[]];
  /** Tokeny designu z docs/08-design-ui.md §1 (Faza 8). */
  isLight: boolean;
  border: string;
  card: string;
  card2: string;
  segOn: string;
  track: string;
  sheet: string;
  veil: string;
  onPrimary: string;
  link: string;
  /** Trzy plamy aurory za treścią (kolor z alfą). */
  aurora: readonly [string, string, string];
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
    isLight: false,
    border: 'rgba(255,255,255,0.10)',
    card: 'rgba(255,255,255,0.06)',
    card2: 'rgba(255,255,255,0.08)',
    segOn: 'rgba(255,255,255,0.16)',
    track: 'rgba(255,255,255,0.10)',
    sheet: 'rgba(24,24,28,0.94)',
    veil: 'rgba(0,0,0,0.6)',
    onPrimary: '#0B0B12',
    link: 'rgba(226,232,240,0.55)',
    aurora: ['rgba(167,139,250,0.50)', 'rgba(244,114,182,0.38)', 'rgba(56,189,248,0.36)'],
  },
  Sepia: {
    background: '#F4ECD8',
    text: '#4A3B32',
    textSecondary: '#7A6B62',
    primary: '#D97757',
    tileBorder: 'rgba(0,0,0,0.1)',
    tileTint: 'light',
    gradientColors: ['#D97757', '#C48A71', '#8C5A46'],
    isLight: true,
    border: 'rgba(0,0,0,0.10)',
    card: 'rgba(255,255,255,0.42)',
    card2: 'rgba(74,59,50,0.06)',
    segOn: 'rgba(255,255,255,0.75)',
    track: 'rgba(74,59,50,0.09)',
    sheet: 'rgba(250,244,230,0.97)',
    veil: 'rgba(244,236,216,0.6)',
    onPrimary: '#FFFFFF',
    link: 'rgba(74,59,50,0.38)',
    aurora: ['rgba(217,119,87,0.20)', 'rgba(196,138,113,0.18)', 'rgba(140,90,70,0.13)'],
  },
  AppleLight: {
    background: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    primary: '#007AFF',
    tileBorder: 'rgba(0,0,0,0.05)',
    tileTint: 'light',
    gradientColors: ['#007AFF', '#5856D6', '#FF2D55'],
    isLight: true,
    border: 'rgba(0,0,0,0.05)',
    card: 'rgba(255,255,255,0.82)',
    card2: 'rgba(0,0,0,0.04)',
    segOn: '#FFFFFF',
    track: 'rgba(0,0,0,0.07)',
    sheet: 'rgba(255,255,255,0.97)',
    veil: 'rgba(255,255,255,0.6)',
    onPrimary: '#FFFFFF',
    link: 'rgba(28,28,30,0.35)',
    aurora: ['rgba(0,122,255,0.16)', 'rgba(88,86,214,0.13)', 'rgba(255,45,85,0.11)'],
  },
};

interface SettingsState {
  lifeGoals: string[];
  theme: ThemeName;
  aiPersonality: AIPersonality;
  roundTableMembers: string[];
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  setHasHydrated: (state: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setGoals: (goals: string[]) => void;
  addGoal: (goal: string) => void;
  removeGoal: (goal: string) => void;
  clearGoals: () => void;
  setTheme: (theme: ThemeName) => void;
  setAIPersonality: (personality: AIPersonality) => void;
  setRoundTableMembers: (members: string[]) => void;
  toggleRoundTableMember: (member: string) => void;
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
      roundTableMembers: ['deida', 'huberman'],
      hasHydrated: false,
      hasCompletedOnboarding: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
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
        set({ lifeGoals: [], hasCompletedOnboarding: false });
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
      setRoundTableMembers: (roundTableMembers) => {
        set({ roundTableMembers });
        syncProfileToCloud({ roundTableMembers });
      },
      toggleRoundTableMember: (member) => {
        set((state) => {
          const exists = state.roundTableMembers.includes(member);
          const next = exists
            ? state.roundTableMembers.filter((m) => m !== member)
            : [...state.roundTableMembers, member];
          syncProfileToCloud({ roundTableMembers: next });
          return { roundTableMembers: next };
        });
      },
      applyProfile: (profile) => {
        set((state) => ({
          lifeGoals: profile.lifeGoals !== undefined ? profile.lifeGoals : state.lifeGoals,
          theme: (profile.theme as ThemeName) || state.theme,
          aiPersonality: (profile.aiPersonality as AIPersonality) || state.aiPersonality,
          roundTableMembers: profile.roundTableMembers || state.roundTableMembers,
          hasCompletedOnboarding:
            profile.lifeGoals && profile.lifeGoals.length > 0 ? true : state.hasCompletedOnboarding,
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
              roundTableMembers: profile.roundTableMembers || state.roundTableMembers,
              hasCompletedOnboarding:
                profile.lifeGoals && profile.lifeGoals.length > 0 ? true : state.hasCompletedOnboarding,
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
          roundTableMembers: ['deida', 'huberman'],
          hasCompletedOnboarding: false,
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
