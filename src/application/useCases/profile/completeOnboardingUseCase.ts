import { IProfileRepository } from '../../../domain/repositories/IProfileRepository';
import { Profile } from '../../../domain/models/Profile';

export interface CompleteOnboardingParams {
  userId: string;
  lifeGoals: string[];
  aiPersonality?: string | null;
  theme?: string | null;
  timezone?: string;
}

export const completeOnboardingUseCase = async (
  profileRepository: IProfileRepository,
  params: CompleteOnboardingParams,
): Promise<Profile> => {
  if (!params.userId || !params.userId.trim()) {
    throw new Error('User ID is required');
  }

  const defaultTimezone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC';

  const timezone = params.timezone || defaultTimezone;

  return profileRepository.upsertProfile({
    userId: params.userId,
    lifeGoals: params.lifeGoals,
    aiPersonality: params.aiPersonality ?? 'Po prostu przyjaciel',
    theme: params.theme ?? 'AppleDark',
    timezone,
  });
};
