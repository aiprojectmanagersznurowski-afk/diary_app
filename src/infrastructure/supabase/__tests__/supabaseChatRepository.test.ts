import { SupabaseChatRepository } from '../supabaseChatRepository';

describe('SupabaseChatRepository', () => {
  it('fetches threads ordered by created_at desc', async () => {
    const mockOrder = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'thread-1',
          user_id: 'user-1',
          title: 'Wątek 1',
          created_at: '2026-10-01T12:00:00Z',
        },
      ],
      error: null,
    });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

    const client = {
      from: mockFrom,
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    } as any;

    const repo = new SupabaseChatRepository(client);
    const threads = await repo.getThreads();

    expect(mockFrom).toHaveBeenCalledWith('chat_threads');
    expect(mockSelect).toHaveBeenCalledWith('id, user_id, title, created_at');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe('thread-1');
  });

  it('fetches messages for thread ordered by created_at asc', async () => {
    const mockOrder = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          thread_id: 'thread-1',
          user_id: 'user-1',
          role: 'user',
          content: 'Pytanie',
          citations: [],
          created_at: '2026-10-01T12:01:00Z',
        },
      ],
      error: null,
    });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

    const client = {
      from: mockFrom,
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    } as any;

    const repo = new SupabaseChatRepository(client);
    const messages = await repo.getMessages('thread-1');

    expect(mockFrom).toHaveBeenCalledWith('chat_messages');
    expect(mockEq).toHaveBeenCalledWith('thread_id', 'thread-1');
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Pytanie');
  });

  it('streams message via SSE fetch and parses tokens and done event', async () => {
    const client = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-anon-key',
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'jwt-123' } },
        }),
      },
    } as any;

    const sseResponseText = [
      'data: {"type":"token","content":"Wczoraj "}\n\n',
      'data: {"type":"token","content":"miałeś pomysł [doc:doc-1]. "}\n\n',
      'data: {"type":"done","thread_id":"t-100","message_id":"msg-200","citations":[{"documentId":"doc-1","title":"Pomysł","day":"2026-09-30","kind":"note","noteType":"idea","snippet":"test"}],"content":"Wczoraj miałeś pomysł [doc:doc-1]. "}\n\n',
    ].join('');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(sseResponseText),
      body: null,
    });

    const repo = new SupabaseChatRepository(client, mockFetch);
    const tokens: string[] = [];
    let donePayload: any = null;

    const result = await repo.sendMessageStreaming({
      message: 'Co wczoraj wymyśliłem?',
      callbacks: {
        onToken: (t) => tokens.push(t),
        onDone: (d) => {
          donePayload = d;
        },
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-123',
          apikey: 'test-anon-key',
        }),
      }),
    );

    expect(tokens).toEqual(['Wczoraj ', 'miałeś pomysł [doc:doc-1]. ']);
    expect(donePayload).not.toBeNull();
    expect(donePayload.threadId).toBe('t-100');
    expect(result.threadId).toBe('t-100');
    expect(result.messageId).toBe('msg-200');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].documentId).toBe('doc-1');
  });

  it('handles HTTP error status by calling onError and throwing', async () => {
    const client = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-anon-key',
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    } as any;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: 'Brak autoryzacji' }),
    });

    const repo = new SupabaseChatRepository(client, mockFetch);
    const onError = jest.fn();

    await expect(
      repo.sendMessageStreaming({
        message: 'Cześć',
        callbacks: { onError },
      }),
    ).rejects.toThrow('Brak autoryzacji');

    expect(onError).toHaveBeenCalled();
  });
});
