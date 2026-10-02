import { IChatRepository, StreamChatCallbacks } from '../../../domain/repositories/IChatRepository';
import { Citation } from '../../../domain/models/Chat';

export interface SendChatMessageInput {
  message: string;
  threadId?: string;
  timezone?: string;
  callbacks?: StreamChatCallbacks;
}

export class SendChatMessageUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(input: SendChatMessageInput): Promise<{
    threadId: string;
    messageId: string;
    citations: Citation[];
    content: string;
  }> {
    const trimmed = input.message.trim();
    if (!trimmed) {
      throw new Error('Wiadomość nie może być pusta');
    }

    return this.chatRepository.sendMessageStreaming({
      message: trimmed,
      threadId: input.threadId,
      timezone: input.timezone,
      callbacks: input.callbacks,
    });
  }
}
