import { IProfileRepository } from '../../../domain/repositories/IProfileRepository';
import { Profile } from '../../../domain/models/Profile';

export const getProfileUseCase = async (
  profileRepository: IProfileRepository,
  userId: string,
): Promise<Profile | null> => {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }
  return profileRepository.getProfile(userId);
};
