import { User } from '../models/User';

export interface IAuthRepository {
  signInWithGoogle(idToken: string): Promise<User>;
  signInWithApple(identityToken: string, nonce: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}
