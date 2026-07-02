import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../../infrastructure/firebase/firebaseConfig';

export type ThemeName = 'AppleDark' | 'Sepia' | 'AppleLight';

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
  }
};

interface SettingsState {
  lifeGoals: string[];
  theme: ThemeName;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setGoals: (goals: string[]) => void;
  addGoal: (goal: string) => void;
  removeGoal: (goal: string) => void;
  clearGoals: () => void;
  setTheme: (theme: ThemeName) => void;
  syncGoalsFromCloud: () => Promise<void>;
}

const syncToCloud = async (dataToSync: Partial<SettingsState>) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).set(dataToSync, { merge: true });
  } catch (error) {
    console.error('Failed to sync to cloud', error);
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lifeGoals: [],
      theme: 'AppleDark',
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setGoals: (goals) => {
        set({ lifeGoals: goals });
        syncToCloud({ lifeGoals: goals });
      },
      addGoal: (goal) => {
        set((state) => {
          const newGoals = [...state.lifeGoals, goal];
          syncToCloud({ lifeGoals: newGoals });
          return { lifeGoals: newGoals };
        });
      },
      removeGoal: (goal) => {
        set((state) => {
          const newGoals = state.lifeGoals.filter(g => g !== goal);
          syncToCloud({ lifeGoals: newGoals });
          return { lifeGoals: newGoals };
        });
      },
      clearGoals: () => {
        set({ lifeGoals: [] });
        syncToCloud({ lifeGoals: [] });
      },
      setTheme: (theme) => {
        set({ theme });
        syncToCloud({ theme });
      },
      syncGoalsFromCloud: async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          const data = doc.data();
          if (data) {
            if (data.lifeGoals) {
              set({ lifeGoals: data.lifeGoals });
            }
            if (data.theme) {
              set({ theme: data.theme });
            }
          }
        } catch (error) {
          console.error('Failed to fetch from cloud', error);
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
