import { IProfileRepository } from '../../../../domain/repositories/IProfileRepository';
import { Profile } from '../../../../domain/models/Profile';
import { getProfileUseCase } from '../getProfileUseCase';
import { saveProfileUseCase } from '../saveProfileUseCase';
import { completeOnboardingUseCase } from '../completeOnboardingUseCase';

describe('Profile Use Cases', () => {
  let mockProfileRepository: jest.Mocked<IProfileRepository>;

  const mockProfile: Profile = {
    userId: 'user-123',
    lifeGoals: ['Ćwiczyć regularnie', 'Czytać książki'],
    aiPersonality: 'Buddha',
    theme: 'AppleDark',
    timezone: 'Europe/Warsaw',
    currentStreak: 5,
    lastEntryDay: '2026-09-25',
    badges: ['first_step', 'streak_3'],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-25T10:00:00Z',
  };

  beforeEach(() => {
    mockProfileRepository = {
      getProfile: jest.fn(),
      upsertProfile: jest.fn(),
    };
  });

  describe('getProfileUseCase', () => {
    it('zwraca profil użytkownika gdy istnieje w repozytorium', async () => {
      mockProfileRepository.getProfile.mockResolvedValue(mockProfile);

      const result = await getProfileUseCase(mockProfileRepository, 'user-123');

      expect(mockProfileRepository.getProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockProfile);
    });

    it('zwraca null gdy profil nie istnieje', async () => {
      mockProfileRepository.getProfile.mockResolvedValue(null);

      const result = await getProfileUseCase(mockProfileRepository, 'unknown-user');

      expect(mockProfileRepository.getProfile).toHaveBeenCalledWith('unknown-user');
      expect(result).toBeNull();
    });

    it('rzuca błąd gdy userId jest pusty', async () => {
      await expect(getProfileUseCase(mockProfileRepository, '')).rejects.toThrow('User ID is required');
      await expect(getProfileUseCase(mockProfileRepository, '   ')).rejects.toThrow('User ID is required');
      expect(mockProfileRepository.getProfile).not.toHaveBeenCalled();
    });

    it('propaguje błąd z repozytorium', async () => {
      mockProfileRepository.getProfile.mockRejectedValue(new Error('DB failure'));

      await expect(getProfileUseCase(mockProfileRepository, 'user-123')).rejects.toThrow('DB failure');
    });
  });

  describe('saveProfileUseCase', () => {
    it('zapisuje profil z podanymi danymi i strefą czasową', async () => {
      mockProfileRepository.upsertProfile.mockResolvedValue(mockProfile);

      const result = await saveProfileUseCase(mockProfileRepository, {
        userId: 'user-123',
        lifeGoals: ['Nowy cel'],
        theme: 'Sepia',
        timezone: 'America/New_York',
      });

      expect(mockProfileRepository.upsertProfile).toHaveBeenCalledWith({
        userId: 'user-123',
        lifeGoals: ['Nowy cel'],
        theme: 'Sepia',
        timezone: 'America/New_York',
      });
      expect(result).toEqual(mockProfile);
    });

    it('uzupełnia domyślną strefę czasową urządzenia gdy nie podano strefy', async () => {
      mockProfileRepository.upsertProfile.mockResolvedValue(mockProfile);

      await saveProfileUseCase(mockProfileRepository, {
        userId: 'user-123',
        lifeGoals: ['Cel bez strefy'],
      });

      expect(mockProfileRepository.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          lifeGoals: ['Cel bez strefy'],
          timezone: expect.any(String),
        }),
      );
    });

    it('rzuca błąd gdy userId jest pusty', async () => {
      await expect(
        saveProfileUseCase(mockProfileRepository, {
          userId: '',
          lifeGoals: ['Cel'],
        }),
      ).rejects.toThrow('User ID is required');

      expect(mockProfileRepository.upsertProfile).not.toHaveBeenCalled();
    });

    it('propaguje błąd z repozytorium', async () => {
      mockProfileRepository.upsertProfile.mockRejectedValue(new Error('Upsert error'));

      await expect(
        saveProfileUseCase(mockProfileRepository, {
          userId: 'user-123',
          lifeGoals: ['Cel'],
        }),
      ).rejects.toThrow('Upsert error');
    });
  });

  describe('completeOnboardingUseCase', () => {
    it('zapisuje cele, osobowość, motyw i strefę czasową w profiles', async () => {
      mockProfileRepository.upsertProfile.mockResolvedValue(mockProfile);

      const result = await completeOnboardingUseCase(mockProfileRepository, {
        userId: 'user-123',
        lifeGoals: ['Zbudować nawyk', 'Medytować'],
        aiPersonality: 'Buddha',
        theme: 'Sepia',
        timezone: 'Europe/Warsaw',
      });

      expect(mockProfileRepository.upsertProfile).toHaveBeenCalledWith({
        userId: 'user-123',
        lifeGoals: ['Zbudować nawyk', 'Medytować'],
        aiPersonality: 'Buddha',
        theme: 'Sepia',
        timezone: 'Europe/Warsaw',
      });
      expect(result).toEqual(mockProfile);
    });

    it('używa wartości domyślnych dla osobowości, motywu i strefy gdy nie zostały podane', async () => {
      mockProfileRepository.upsertProfile.mockResolvedValue(mockProfile);

      await completeOnboardingUseCase(mockProfileRepository, {
        userId: 'user-123',
        lifeGoals: ['Tylko cel'],
      });

      expect(mockProfileRepository.upsertProfile).toHaveBeenCalledWith({
        userId: 'user-123',
        lifeGoals: ['Tylko cel'],
        aiPersonality: 'Po prostu przyjaciel',
        theme: 'AppleDark',
        timezone: expect.any(String),
      });
    });

    it('rzuca błąd gdy userId jest pusty', async () => {
      await expect(
        completeOnboardingUseCase(mockProfileRepository, {
          userId: '',
          lifeGoals: ['Cel'],
        }),
      ).rejects.toThrow('User ID is required');

      expect(mockProfileRepository.upsertProfile).not.toHaveBeenCalled();
    });

    it('propaguje błąd z repozytorium', async () => {
      mockProfileRepository.upsertProfile.mockRejectedValue(new Error('Onboarding save error'));

      await expect(
        completeOnboardingUseCase(mockProfileRepository, {
          userId: 'user-123',
          lifeGoals: ['Cel'],
        }),
      ).rejects.toThrow('Onboarding save error');
    });
  });
});
