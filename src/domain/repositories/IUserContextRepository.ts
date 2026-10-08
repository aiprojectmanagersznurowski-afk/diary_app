import { UserContextFile } from '../models/UserContextFile';

export interface IUserContextRepository {
  getContextFiles(userId: string): Promise<UserContextFile[]>;
  saveContextFile(userId: string, filename: string, content: string): Promise<void>;
  deleteContextFile(userId: string, filename: string): Promise<void>;
}
