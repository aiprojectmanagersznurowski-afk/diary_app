import { supabase } from '../infrastructure/supabase/supabaseClient';
import { SupabaseProfileRepository } from '../infrastructure/profile/SupabaseProfileRepository';
import { IProfileRepository } from '../domain/repositories/IProfileRepository';
import { Profile } from '../domain/models/Profile';
import { getProfileUseCase } from '../application/useCases/profile/getProfileUseCase';
import { saveProfileUseCase, SaveProfileDTO } from '../application/useCases/profile/saveProfileUseCase';
import {
  completeOnboardingUseCase,
  CompleteOnboardingParams,
} from '../application/useCases/profile/completeOnboardingUseCase';
import { setProfileRepository } from '../application/store/useSettingsStore';
import { setGamificationProfileRepository } from '../application/store/useGamificationStore';

export const profileRepository: IProfileRepository = new SupabaseProfileRepository(supabase);

// Inicjalizacja repozytoriów w store'ach
setProfileRepository(profileRepository);
setGamificationProfileRepository(profileRepository);

export const profileService = {
  getProfile: (userId: string): Promise<Profile | null> => getProfileUseCase(profileRepository, userId),
  saveProfile: (dto: SaveProfileDTO): Promise<Profile> => saveProfileUseCase(profileRepository, dto),
  completeOnboarding: (params: CompleteOnboardingParams): Promise<Profile> =>
    completeOnboardingUseCase(profileRepository, params),
};
