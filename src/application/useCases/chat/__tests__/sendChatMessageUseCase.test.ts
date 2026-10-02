import { SendChatMessageUseCase } from '../sendChatMessageUseCase';
import { IChatRepository } from '../../../../domain/repositories/IChatRepository';

describe('SendChatMessageUseCase', () => {
  it('throws an error when message is empty or whitespace', async () => {
    const mockRepo: jest.Mocked<IChatRepository> = {
      getThreads: jest.fn(),
      getMessages: jest.fn(),
      createThread: jest.fn(),
      deleteThread: jest.fn(),
      sendMessageStreaming: jest.fn(),
    };

    const useCase = new SendChatMessageUseCase(mockRepo);

    await expect(useCase.execute({ message: '   ' })).rejects.toThrow('Wiadomość nie może być pusta');
    expect(mockRepo.sendMessageStreaming).not.toHaveBeenCalled();
  });

  it('calls sendMessageStreaming with trimmed message and returns result', async () => {
    const mockRepo: jest.Mocked<IChatRepository> = {
      getThreads: jest.fn(),
      getMessages: jest.fn(),
      createThread: jest.fn(),
      deleteThread: jest.fn(),
      sendMessageStreaming: jest.fn().mockResolvedValue({
        threadId: 'thread-1',
        messageId: 'msg-1',
        citations: [],
        content: 'Odpowiedź',
      }),
    };

    const useCase = new SendChatMessageUseCase(mockRepo);
    const result = await useCase.execute({
      message: '  Cześć pamiętniku  ',
      threadId: 'thread-1',
    });

    expect(result.threadId).toBe('thread-1');
    expect(result.content).toBe('Odpowiedź');
    expect(mockRepo.sendMessageStreaming).toHaveBeenCalledWith({
      message: 'Cześć pamiętniku',
      threadId: 'thread-1',
      timezone: undefined,
      callbacks: undefined,
    });
  });
});
