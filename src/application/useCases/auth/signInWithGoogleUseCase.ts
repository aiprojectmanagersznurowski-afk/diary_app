import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { User } from '../../../domain/models/User';

export async function signInWithGoogleUseCase(authRepo: IAuthRepository, idToken: string): Promise<User> {
  if (!idToken || !idToken.trim()) {
    throw new Error('Brak tokenu ID Google.');
  }
  return authRepo.signInWithGoogle(idToken.trim());
}
