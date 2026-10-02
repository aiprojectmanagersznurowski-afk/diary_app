import { IChatRepository } from '../../../domain/repositories/IChatRepository';
import { ChatMessage } from '../../../domain/models/Chat';

export class GetChatMessagesUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(threadId: string): Promise<ChatMessage[]> {
    if (!threadId) return [];
    return this.chatRepository.getMessages(threadId);
  }
}
