import { ChatMessage, ChatThread, Citation } from '../Chat';

describe('Chat Models', () => {
  it('creates a valid Citation object', () => {
    const citation: Citation = {
      documentId: 'doc-123',
      title: 'Moja notatka',
      day: '2026-09-30',
      kind: 'note',
      noteType: 'idea',
      snippet: 'Ważna treść notatki',
    };

    expect(citation.documentId).toBe('doc-123');
    expect(citation.title).toBe('Moja notatka');
    expect(citation.kind).toBe('note');
  });

  it('creates a valid ChatMessage object with citations', () => {
    const msg: ChatMessage = {
      id: 'msg-1',
      threadId: 'thread-1',
      userId: 'user-1',
      role: 'assistant',
      content: 'Odpowiedź asystenta z cytatem [doc:doc-123]',
      citations: [
        {
          documentId: 'doc-123',
          title: 'Moja notatka',
          day: '2026-09-30',
          kind: 'note',
          noteType: 'idea',
          snippet: 'Ważna treść',
        },
      ],
      createdAt: '2026-10-01T12:00:00Z',
    };

    expect(msg.role).toBe('assistant');
    expect(msg.citations).toHaveLength(1);
    expect(msg.citations[0].documentId).toBe('doc-123');
  });

  it('creates a valid ChatThread object', () => {
    const thread: ChatThread = {
      id: 'thread-1',
      userId: 'user-1',
      title: 'Nowy czat o pomysłach',
      createdAt: '2026-10-01T12:00:00Z',
    };

    expect(thread.id).toBe('thread-1');
    expect(thread.title).toBe('Nowy czat o pomysłach');
  });
});
