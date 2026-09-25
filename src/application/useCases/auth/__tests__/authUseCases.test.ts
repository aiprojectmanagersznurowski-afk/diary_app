import { IAuthRepository } from '../../../../domain/repositories/IAuthRepository';
import { User } from '../../../../domain/models/User';
import { signInWithGoogleUseCase } from '../signInWithGoogleUseCase';
import { signInWithAppleUseCase } from '../signInWithAppleUseCase';
import { signOutUseCase } from '../signOutUseCase';
import { getCurrentUserUseCase } from '../getCurrentUserUseCase';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useGamificationStore } from '../../../store/useGamificationStore';
import { useDiaryStore } from '../../../store/useDiaryStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
  },
  setItem: jest.fn().mockResolvedValue(null),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(null),
  multiRemove: jest.fn().mockResolvedValue(null),
}));
jest.mock('expo-audio', () => ({
  AudioModule: {},
  RecordingPresets: {},
  requestRecordingPermissionsAsync: jest.fn(),
}));

describe('Auth Use Cases', () => {
  const mockUser: User = {
    id: 'test-user-id-123',
    email: 'user@example.com',
    name: 'Jan Kowalski',
    avatarUrl: 'https://example.com/avatar.png',
  };

  let mockAuthRepository: jest.Mocked<IAuthRepository>;

  beforeEach(() => {
    mockAuthRepository = {
      signInWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
      signOut: jest.fn(),
      getCurrentUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    };
  });

  describe('signInWithGoogleUseCase', () => {
    it('zwraca użytkownika przy poprawnym tokenie Google ID', async () => {
      mockAuthRepository.signInWithGoogle.mockResolvedValueOnce(mockUser);

      const result = await signInWithGoogleUseCase(mockAuthRepository, 'valid-google-id-token');

      expect(mockAuthRepository.signInWithGoogle).toHaveBeenCalledWith('valid-google-id-token');
      expect(result).toEqual(mockUser);
    });

    it('rzuca błąd gdy token ID jest pusty', async () => {
      await expect(signInWithGoogleUseCase(mockAuthRepository, '')).rejects.toThrow('Brak tokenu ID Google.');
      await expect(signInWithGoogleUseCase(mockAuthRepository, '   ')).rejects.toThrow('Brak tokenu ID Google.');
      expect(mockAuthRepository.signInWithGoogle).not.toHaveBeenCalled();
    });

    it('propaguje błąd z repozytorium', async () => {
      mockAuthRepository.signInWithGoogle.mockRejectedValueOnce(new Error('Błąd sieci Supabase'));

      await expect(signInWithGoogleUseCase(mockAuthRepository, 'valid-token')).rejects.toThrow('Błąd sieci Supabase');
    });
  });

  describe('signInWithAppleUseCase', () => {
    it('zwraca użytkownika przy poprawnym tokenie Apple i nonce', async () => {
      mockAuthRepository.signInWithApple.mockResolvedValueOnce(mockUser);

      const result = await signInWithAppleUseCase(mockAuthRepository, 'apple-identity-token', 'random-nonce-123');

      expect(mockAuthRepository.signInWithApple).toHaveBeenCalledWith('apple-identity-token', 'random-nonce-123');
      expect(result).toEqual(mockUser);
    });

    it('rzuca błąd gdy token tożsamości Apple jest pusty', async () => {
      await expect(signInWithAppleUseCase(mockAuthRepository, '', 'nonce')).rejects.toThrow(
        'Brak tokenu tożsamości Apple.',
      );
      await expect(signInWithAppleUseCase(mockAuthRepository, '   ', 'nonce')).rejects.toThrow(
        'Brak tokenu tożsamości Apple.',
      );
      expect(mockAuthRepository.signInWithApple).not.toHaveBeenCalled();
    });

    it('propaguje błąd z repozytorium', async () => {
      mockAuthRepository.signInWithApple.mockRejectedValueOnce(new Error('Błąd weryfikacji tokenu Apple'));

      await expect(signInWithAppleUseCase(mockAuthRepository, 'apple-token', 'nonce')).rejects.toThrow(
        'Błąd weryfikacji tokenu Apple',
      );
    });
  });

  describe('signOutUseCase', () => {
    it('wywołuje metodę signOut w repozytorium', async () => {
      mockAuthRepository.signOut.mockResolvedValueOnce();

      await signOutUseCase(mockAuthRepository);

      expect(mockAuthRepository.signOut).toHaveBeenCalledTimes(1);
    });

    it("resetuje wszystkie store'y (auth, settings, gamification, diary)", async () => {
      mockAuthRepository.signOut.mockResolvedValueOnce();

      // Ustawienie niepustego stanu we wszystkich store'ach
      useAuthStore.getState().setUser(mockUser);
      useSettingsStore.getState().setGoals(['Cel 1', 'Cel 2']);
      useSettingsStore.getState().setTheme('Sepia');
      useSettingsStore.getState().setAIPersonality('Buddha');
      useGamificationStore.getState().processNewEntry('2026-09-25T12:00:00Z');
      useDiaryStore.setState({
        entries: [
          {
            id: 'entry-1',
            date: new Date(),
            fullText: 'Tekst wpisu',
            parsedData: null,
            createdAt: new Date(),
          },
        ],
      });

      // Weryfikacja że dane są w store'ach przed wylogowaniem
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useSettingsStore.getState().lifeGoals).toEqual(['Cel 1', 'Cel 2']);
      expect(useSettingsStore.getState().theme).toBe('Sepia');
      expect(useSettingsStore.getState().aiPersonality).toBe('Buddha');
      expect(useGamificationStore.getState().currentStreak).toBeGreaterThan(0);
      expect(useDiaryStore.getState().entries.length).toBe(1);

      // Wywołanie signOutUseCase
      await signOutUseCase(mockAuthRepository);

      // Weryfikacja że każdy store został zresetowany do stanu początkowego
      expect(useAuthStore.getState().user).toBeNull();
      expect(useSettingsStore.getState().lifeGoals).toEqual([]);
      expect(useSettingsStore.getState().theme).toBe('AppleDark');
      expect(useSettingsStore.getState().aiPersonality).toBe('Po prostu przyjaciel');
      expect(useGamificationStore.getState().currentStreak).toBe(0);
      expect(useGamificationStore.getState().lastEntryDate).toBeNull();
      expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
      expect(useDiaryStore.getState().entries).toEqual([]);
    });

    it('wywołuje punkt rozszerzenia czyszczenia lokalnej kolejki nagrań', async () => {
      mockAuthRepository.signOut.mockResolvedValueOnce();
      const mockClearQueue = jest.fn().mockResolvedValue(undefined);

      await signOutUseCase(mockAuthRepository, { clearLocalQueue: mockClearQueue });

      expect(mockClearQueue).toHaveBeenCalledTimes(1);
    });

    it('propaguje błąd z repozytorium', async () => {
      mockAuthRepository.signOut.mockRejectedValueOnce(new Error('Błąd wylogowania'));

      await expect(signOutUseCase(mockAuthRepository)).rejects.toThrow('Błąd wylogowania');
    });
  });

  describe('getCurrentUserUseCase', () => {
    it('zwraca użytkownika gdy sesja istnieje', async () => {
      mockAuthRepository.getCurrentUser.mockResolvedValueOnce(mockUser);

      const result = await getCurrentUserUseCase(mockAuthRepository);

      expect(mockAuthRepository.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });

    it('zwraca null gdy brak sesji', async () => {
      mockAuthRepository.getCurrentUser.mockResolvedValueOnce(null);

      const result = await getCurrentUserUseCase(mockAuthRepository);

      expect(mockAuthRepository.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });
});
