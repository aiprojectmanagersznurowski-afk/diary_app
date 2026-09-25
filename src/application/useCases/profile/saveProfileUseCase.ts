import { IProfileRepository } from '../../../domain/repositories/IProfileRepository';
import { Profile } from '../../../domain/models/Profile';

export interface SaveProfileDTO {
  userId: string;
  lifeGoals?: string[];
  aiPersonality?: string | null;
  theme?: string | null;
  timezone?: string;
  currentStreak?: number;
  lastEntryDay?: string | null;
  badges?: string[];
}

export const saveProfileUseCase = async (
  profileRepository: IProfileRepository,
  dto: SaveProfileDTO,
): Promise<Profile> => {
  if (!dto.userId || !dto.userId.trim()) {
    throw new Error('User ID is required');
  }

  const defaultTimezone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC';

  const timezone = dto.timezone || defaultTimezone;

  return profileRepository.upsertProfile({
    ...dto,
    timezone,
  });
};
