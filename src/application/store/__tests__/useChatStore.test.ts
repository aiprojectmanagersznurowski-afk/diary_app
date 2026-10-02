import { useChatStore, setChatDependencies } from '../useChatStore';
import { IChatRepository } from '../../../domain/repositories/IChatRepository';

describe('useChatStore', () => {
  let mockRepo: jest.Mocked<IChatRepository>;

  beforeEach(() => {
    mockRepo = {
      getThreads: jest.fn().mockResolvedValue([
        {
          id: 't-1',
          userId: 'u-1',
          title: 'Wątek 1',
          createdAt: '2026-10-01T10:00:00Z',
        },
      ]),
      getMessages: jest.fn().mockResolvedValue([
        {
          id: 'm-1',
          threadId: 't-1',
          userId: 'u-1',
          role: 'user',
          content: 'Cześć',
          citations: [],
          createdAt: '2026-10-01T10:01:00Z',
        },
      ]),
      createThread: jest.fn(),
      deleteThread: jest.fn().mockResolvedValue(undefined),
      sendMessageStreaming: jest.fn().mockImplementation(async ({ callbacks }) => {
        callbacks?.onToken?.('Token 1 ');
        callbacks?.onToken?.('Token 2');
        return {
          threadId: 't-new',
          messageId: 'm-assistant',
          citations: [
            {
              documentId: 'doc-1',
              title: 'Notatka 1',
              day: '2026-09-30',
              kind: 'note',
              noteType: 'idea',
              snippet: 'Pomysł',
            },
          ],
          content: 'Token 1 Token 2',
        };
      }),
    };

    setChatDependencies({ chatRepository: mockRepo });
    useChatStore.getState().reset();
  });

  it('loads threads into state', async () => {
    await useChatStore.getState().loadThreads();
    expect(mockRepo.getThreads).toHaveBeenCalled();
    expect(useChatStore.getState().threads).toHaveLength(1);
    expect(useChatStore.getState().threads[0].id).toBe('t-1');
  });

  it('selects thread and loads its messages', async () => {
    await useChatStore.getState().selectThread('t-1');
    expect(mockRepo.getMessages).toHaveBeenCalledWith('t-1');
    expect(useChatStore.getState().activeThreadId).toBe('t-1');
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('starts a new thread by clearing active thread and messages', () => {
    useChatStore.setState({
      activeThreadId: 't-1',
      messages: [
        {
          id: 'm-1',
          threadId: 't-1',
          userId: 'u-1',
          role: 'user',
          content: 'Hej',
          citations: [],
          createdAt: '',
        },
      ],
    });

    useChatStore.getState().startNewThread();
    expect(useChatStore.getState().activeThreadId).toBeNull();
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('sends message with streaming and commits assistant response', async () => {
    await useChatStore.getState().sendMessage('Jakie miałem pomysły?');

    expect(mockRepo.sendMessageStreaming).toHaveBeenCalled();
    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(2); // 1 user + 1 assistant
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Jakie miałem pomysły?');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('Token 1 Token 2');
    expect(messages[1].citations).toHaveLength(1);
    expect(useChatStore.getState().activeThreadId).toBe('t-new');
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('deletes thread and removes it from store', async () => {
    useChatStore.setState({
      threads: [
        { id: 't-1', userId: 'u-1', title: 'Wątek 1', createdAt: '' },
        { id: 't-2', userId: 'u-1', title: 'Wątek 2', createdAt: '' },
      ],
      activeThreadId: 't-1',
    });

    await useChatStore.getState().deleteThread('t-1');
    expect(mockRepo.deleteThread).toHaveBeenCalledWith('t-1');
    expect(useChatStore.getState().threads).toHaveLength(1);
    expect(useChatStore.getState().threads[0].id).toBe('t-2');
    expect(useChatStore.getState().activeThreadId).toBeNull();
  });
});
