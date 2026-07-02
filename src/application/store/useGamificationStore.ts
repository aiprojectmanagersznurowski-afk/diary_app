import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../../infrastructure/firebase/firebaseConfig';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string; // Feather icon name
}

export const BADGES_DICTIONARY: BadgeDef[] = [
  {
    id: 'first_step',
    title: 'Pierwszy Krok',
    description: 'Dodaj swój pierwszy wpis do pamiętnika.',
    icon: 'star'
  },
  {
    id: 'streak_3',
    title: 'Trzy Dni Refleksji',
    description: 'Spisuj swoje myśli przez 3 dni z rzędu.',
    icon: 'award'
  },
  {
    id: 'streak_7',
    title: 'Tydzień Świadomości',
    description: 'Spisuj swoje myśli przez 7 dni z rzędu.',
    icon: 'zap'
  }
];

interface GamificationState {
  currentStreak: number;
  lastEntryDate: string | null;
  unlockedBadges: string[];
  newlyUnlockedBadge: BadgeDef | null;
  
  // Actions
  processNewEntry: (dateIso: string) => void;
  clearGamification: () => void;
  syncFromCloud: () => Promise<void>;
  dismissBadgeAlert: () => void;
}

// Helpers
const getLocalYYYYMMDD = (dateString: string) => {
  const date = new Date(dateString);
  // Using local timezone extraction
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysDifference = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const syncToCloud = async (state: Partial<GamificationState>) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const dataToSync: any = {};
    if (state.currentStreak !== undefined) dataToSync.currentStreak = state.currentStreak;
    if (state.lastEntryDate !== undefined) dataToSync.lastEntryDate = state.lastEntryDate;
    if (state.unlockedBadges !== undefined) dataToSync.unlockedBadges = state.unlockedBadges;

    if (Object.keys(dataToSync).length > 0) {
      await db.collection('users').doc(user.uid).set({ gamification: dataToSync }, { merge: true });
    }
  } catch (error) {
    console.error('Failed to sync gamification to cloud', error);
  }
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      lastEntryDate: null,
      unlockedBadges: [],
      newlyUnlockedBadge: null,

      dismissBadgeAlert: () => {
        set({ newlyUnlockedBadge: null });
      },

      clearGamification: () => {
        set({
          currentStreak: 0,
          lastEntryDate: null,
          unlockedBadges: [],
          newlyUnlockedBadge: null
        });
      },

      syncFromCloud: async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          const data = doc.data();
          if (data && data.gamification) {
            set({
              currentStreak: data.gamification.currentStreak || 0,
              lastEntryDate: data.gamification.lastEntryDate || null,
              unlockedBadges: data.gamification.unlockedBadges || []
            });
          }
        } catch (error) {
          console.error('Failed to fetch gamification from cloud', error);
        }
      },

      processNewEntry: (dateIso: string) => {
        const state = get();
        const newDateStr = getLocalYYYYMMDD(dateIso);
        
        let newStreak = state.currentStreak;
        let newUnlocked = [...state.unlockedBadges];
        let newlyUnlocked: BadgeDef | null = null;

        if (state.lastEntryDate) {
          const diff = getDaysDifference(state.lastEntryDate, newDateStr);
          if (diff === 0) {
            // Same day, streak doesn't change
          } else if (diff === 1) {
            // Next day, increment streak
            newStreak += 1;
          } else {
            // Break in streak
            newStreak = 1;
          }
        } else {
          // First entry ever
          newStreak = 1;
        }

        // Check for badges
        const unlockBadge = (id: string) => {
          if (!newUnlocked.includes(id)) {
            newUnlocked.push(id);
            const badgeDef = BADGES_DICTIONARY.find(b => b.id === id);
            if (badgeDef) newlyUnlocked = badgeDef;
          }
        };

        if (newStreak >= 1) unlockBadge('first_step');
        if (newStreak >= 3) unlockBadge('streak_3');
        if (newStreak >= 7) unlockBadge('streak_7');

        set({
          currentStreak: newStreak,
          lastEntryDate: newDateStr,
          unlockedBadges: newUnlocked,
          ...(newlyUnlocked ? { newlyUnlockedBadge: newlyUnlocked } : {})
        });

        // Sync to Firestore
        syncToCloud({
          currentStreak: newStreak,
          lastEntryDate: newDateStr,
          unlockedBadges: newUnlocked
        });
      }
    }),
    {
      name: 'gamification-storage',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
