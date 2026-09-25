import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { User } from '../../../domain/models/User';

export async function getCurrentUserUseCase(authRepo: IAuthRepository): Promise<User | null> {
  return authRepo.getCurrentUser();
}
