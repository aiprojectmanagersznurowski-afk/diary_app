import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { User } from '../../../domain/models/User';

export async function signInWithAppleUseCase(
  authRepo: IAuthRepository,
  identityToken: string,
  nonce: string,
): Promise<User> {
  if (!identityToken || !identityToken.trim()) {
    throw new Error('Brak tokenu tożsamości Apple.');
  }
  return authRepo.signInWithApple(identityToken.trim(), nonce);
}
