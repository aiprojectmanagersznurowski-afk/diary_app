import { SupabaseClient } from '@supabase/supabase-js';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { Profile } from '../../domain/models/Profile';

interface ProfileRow {
  user_id: string;
  life_goals: string[];
  ai_personality: string | null;
  theme: string | null;
  timezone: string;
  current_streak: number;
  last_entry_day: string | null;
  badges: string[];
  created_at: string;
  updated_at: string;
}

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private client: SupabaseClient) {}

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('user_id', userId).maybeSingle();

    if (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }

    if (!data) return null;

    return this.mapToDomain(data as ProfileRow);
  }

  async upsertProfile(profile: Partial<Profile> & { userId: string }): Promise<Profile> {
    const defaultTimezone =
      typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        : 'UTC';

    const row: Record<string, unknown> = {
      user_id: profile.userId,
      updated_at: new Date().toISOString(),
    };

    if (profile.lifeGoals !== undefined) row.life_goals = profile.lifeGoals;
    if (profile.aiPersonality !== undefined) row.ai_personality = profile.aiPersonality;
    if (profile.theme !== undefined) row.theme = profile.theme;
    if (profile.timezone !== undefined) {
      row.timezone = profile.timezone;
    } else {
      row.timezone = defaultTimezone;
    }
    if (profile.currentStreak !== undefined) row.current_streak = profile.currentStreak;
    if (profile.lastEntryDay !== undefined) row.last_entry_day = profile.lastEntryDay;
    if (profile.badges !== undefined) row.badges = profile.badges;

    const { data, error } = await this.client.from('profiles').upsert(row).select('*').single();

    if (error) {
      throw new Error(`Failed to upsert profile: ${error.message}`);
    }

    return this.mapToDomain(data as ProfileRow);
  }

  private mapToDomain(row: ProfileRow): Profile {
    return {
      userId: row.user_id,
      lifeGoals: row.life_goals ?? [],
      aiPersonality: row.ai_personality ?? null,
      theme: row.theme ?? null,
      timezone: row.timezone ?? 'UTC',
      currentStreak: row.current_streak ?? 0,
      lastEntryDay: row.last_entry_day ?? null,
      badges: row.badges ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
