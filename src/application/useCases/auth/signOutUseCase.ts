import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';

export async function signOutUseCase(authRepo: IAuthRepository): Promise<void> {
  return authRepo.signOut();
}
