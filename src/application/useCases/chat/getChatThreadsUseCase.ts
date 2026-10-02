import { IChatRepository } from '../../../domain/repositories/IChatRepository';
import { ChatThread } from '../../../domain/models/Chat';

export class GetChatThreadsUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(): Promise<ChatThread[]> {
    return this.chatRepository.getThreads();
  }
}
