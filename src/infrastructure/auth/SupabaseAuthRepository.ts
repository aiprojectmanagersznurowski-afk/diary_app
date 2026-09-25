import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '../../domain/models/User';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithGoogle(idToken: string): Promise<User> {
    const { data, error } = await this.client.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      throw new Error(`Błąd logowania przez Google: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Nie udało się uzyskać danych użytkownika z Supabase.');
    }

    return this.mapUser(data.user);
  }

  async signInWithApple(identityToken: string, nonce: string): Promise<User> {
    const { data, error } = await this.client.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce,
    });

    if (error) {
      throw new Error(`Błąd logowania przez Apple: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Nie udało się uzyskać danych użytkownika z Supabase.');
    }

    return this.mapUser(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(`Błąd wylogowania: ${error.message}`);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { session },
    } = await this.client.auth.getSession();
    if (!session?.user) {
      return null;
    }
    return this.mapUser(session.user);
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? this.mapUser(session.user) : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  private mapUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User {
    return {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    };
  }
}
