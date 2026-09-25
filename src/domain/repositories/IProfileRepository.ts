import { Profile } from '../models/Profile';

export interface IProfileRepository {
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(profile: Partial<Profile> & { userId: string }): Promise<Profile>;
}
