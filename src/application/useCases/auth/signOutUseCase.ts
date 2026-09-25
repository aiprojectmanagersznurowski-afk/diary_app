import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useDiaryStore } from '../../store/useDiaryStore';

export interface SignOutOptions {
  clearLocalQueue?: () => Promise<void> | void;
}

export async function signOutUseCase(authRepo: IAuthRepository, options?: SignOutOptions): Promise<void> {
  // 1. Wylogowanie z repozytorium Supabase Auth
  await authRepo.signOut();

  // 2. Reset każdego store'u zustand (w tym wyczyszczenie utrwalonych stanów w AsyncStorage)
  useAuthStore.getState().resetAuth();
  useSettingsStore.getState().resetSettings();
  useGamificationStore.getState().resetGamification();
  useDiaryStore.getState().clearEntries();

  // 3. Punkt rozszerzenia dla lokalnej kolejki nagrań (F2-01)
  if (options?.clearLocalQueue) {
    await options.clearLocalQueue();
  }
}
