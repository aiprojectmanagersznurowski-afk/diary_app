import { supabase } from '../infrastructure/supabase/supabaseClient';
import { SupabaseAuthRepository } from '../infrastructure/auth/SupabaseAuthRepository';
import { IAuthRepository } from '../domain/repositories/IAuthRepository';
import { User } from '../domain/models/User';
import { signInWithGoogleUseCase } from '../application/useCases/auth/signInWithGoogleUseCase';
import { signInWithAppleUseCase } from '../application/useCases/auth/signInWithAppleUseCase';
import { signOutUseCase } from '../application/useCases/auth/signOutUseCase';
import { getCurrentUserUseCase } from '../application/useCases/auth/getCurrentUserUseCase';

export const authRepository: IAuthRepository = new SupabaseAuthRepository(supabase);

export const authService = {
  signInWithGoogle: (idToken: string): Promise<User> => signInWithGoogleUseCase(authRepository, idToken),
  signInWithApple: (identityToken: string, nonce: string): Promise<User> =>
    signInWithAppleUseCase(authRepository, identityToken, nonce),
  signOut: (): Promise<void> => signOutUseCase(authRepository),
  getCurrentUser: (): Promise<User | null> => getCurrentUserUseCase(authRepository),
  onAuthStateChange: (callback: (user: User | null) => void): (() => void) =>
    authRepository.onAuthStateChange(callback),
};
