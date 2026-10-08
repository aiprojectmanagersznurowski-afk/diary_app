/* eslint-disable import/no-unresolved */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { handleRoundTableRequest } from './index.ts';
import { IRoundTableDatabaseClient, UserContextFileRow } from './types.ts';
import { AiProviders } from '../_shared/ai/factory.ts';
import { LlmProvider, LlmMessage, LlmGenerateOptions } from '../_shared/ai/types.ts';

class MockLlmProvider implements LlmProvider {
  readonly providerName = 'groq' as const;
  readonly model = 'mock-llm';

  async generateText(messages: LlmMessage[], _options?: LlmGenerateOptions): Promise<string> {
    const systemMessage = messages.find((m: LlmMessage) => m.role === 'system')?.content || '';
    if (systemMessage.includes('Jesteś głównym Narratorem')) {
      return JSON.stringify({
        consensus: 'Wszyscy doradcy zalecają szczerość z samym sobą.',
        divergence: 'Jedna strona stawia na dyscyplinę, druga na odpoczynek.',
        keyQuestion: 'Co w tej chwili jest Twoim prawdziwym powołaniem?',
        narratorAdvice: 'Podejmij decyzję w spokoju i zaufaj swojemu sercu.',
      });
    }

    return JSON.stringify({
      angle: 'Sedno tego dylematu dotyczy odwagi i wyboru kierunku.',
      recommendation: 'Podejmij mały eksperyment sprawdzający.',
      nextStep: 'Zrób 20-minutowy spacer bez telefonu i podejmij decyzję.',
    });
  }

  async generateJson<T = unknown>(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<T> {
    const text = await this.generateText(messages, options);
    return JSON.parse(text) as T;
  }

  async *streamText(_messages: LlmMessage[], _options?: LlmGenerateOptions): AsyncIterable<string> {
    yield 'mock stream';
  }
}

function createMockAiProviders(): AiProviders {
  const mockLlm = new MockLlmProvider();
  return {
    stt: {
      providerName: 'groq' as const,
      model: 'whisper-large-v3',
      transcribe: async () => 'Transkrypcja testowa',
    },
    structure: mockLlm,
    digest: mockLlm,
    link: mockLlm,
    chat: mockLlm,
    embedding: {
      providerName: 'gemini' as const,
      model: 'gemini-embedding-001',
      dimension: 1536,
      embed: async () => new Array(1536).fill(0.1),
      embedBatch: async (texts: string[]) => texts.map(() => new Array(1536).fill(0.1)),
    },
  };
}

class MockRoundTableDatabaseClient implements IRoundTableDatabaseClient {
  public savedDecisions: Record<string, string> = {};
  public dilemmaContent: string = 'Waham się, czy zmienić pracę na nową, czy zostać w obecnej firmie.';
  public contextFiles: UserContextFileRow[] = [
    { filename: 'VALUES.md', content: '- Wolność i odpowiedzialność\n- Rozwój osobisty' },
    { filename: 'GOALS.md', content: '- Uruchomienie własnego projektu do końca roku' },
  ];

  async getUserId(_authHeader?: string): Promise<string | null> {
    return 'user-123';
  }

  async getUserProfile(_userId: string) {
    return {
      aiPersonality: 'deida',
      roundTableMembers: ['deida', 'huberman'],
    };
  }

  async getDocument(_userId: string, documentId: string) {
    return {
      id: documentId,
      title: 'Czy zmienić pracę?',
      content: this.dilemmaContent,
      category: 'Dylematy',
    };
  }

  async getUserContextFiles(_userId: string) {
    return this.contextFiles;
  }

  async saveAdvisory(_userId: string, _advisory: any) {
    return 'advisory-uuid-1';
  }

  async saveUserDecision(_userId: string, documentId: string, decision: string) {
    this.savedDecisions[documentId] = decision;
  }

  async appendDilemmaDecisionToContext(_userId: string, _title: string, _decision: string) {
    // mock no-op
  }
}

Deno.test('handleRoundTableRequest - OPTIONS returns 200 with CORS', async () => {
  const req = new Request('http://localhost/round-table', { method: 'OPTIONS' });
  const res = await handleRoundTableRequest(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('handleRoundTableRequest - GET returns 405 Method Not Allowed', async () => {
  const req = new Request('http://localhost/round-table', { method: 'GET' });
  const res = await handleRoundTableRequest(req);
  assertEquals(res.status, 405);
});

Deno.test('handleRoundTableRequest - 401 when unauthorized', async () => {
  const db = new MockRoundTableDatabaseClient();
  db.getUserId = async () => null;

  const req = new Request('http://localhost/round-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dilemma_text: 'Dylemat testowy' }),
  });

  const res = await handleRoundTableRequest(req, {
    dbClientFactory: () => db,
    aiProvidersFactory: createMockAiProviders,
  });

  assertEquals(res.status, 401);
});

Deno.test('handleRoundTableRequest - crisis safety gate intercepts crisis phrases', async () => {
  const db = new MockRoundTableDatabaseClient();
  db.dilemmaContent = 'Jestem załamany, nie chcę już żyć i myślę o odebraniu sobie życia';

  const req = new Request('http://localhost/round-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-123' },
    body: JSON.stringify({ document_id: 'doc-crisis-1' }),
  });

  const res = await handleRoundTableRequest(req, {
    dbClientFactory: () => db,
    aiProvidersFactory: createMockAiProviders,
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.crisisDetected, true);
  assertStringIncludes(data.crisisMessage, 'kryzys emocjonalny');
  assertEquals(data.recommendations.length, 0);
  assertEquals(
    data.helplines?.some((h: any) => h.phone === '116 123'),
    true,
  );
});

Deno.test('handleRoundTableRequest - orchestrates advice and narrator synthesis for dilemma', async () => {
  const db = new MockRoundTableDatabaseClient();

  const req = new Request('http://localhost/round-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-123' },
    body: JSON.stringify({
      document_id: 'doc-dilemma-1',
      members: ['deida', 'huberman'],
    }),
  });

  const res = await handleRoundTableRequest(req, {
    dbClientFactory: () => db,
    aiProvidersFactory: createMockAiProviders,
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.crisisDetected, false);
  assertEquals(data.recommendations.length, 2);
  assertEquals(data.recommendations[0].personaId, 'deida');
  assertEquals(data.recommendations[1].personaId, 'huberman');
  assertStringIncludes(data.narratorSynthesis?.consensus, 'szczerość');
  assertStringIncludes(data.narratorSynthesis?.keyQuestion, 'powołaniem');
});

Deno.test('handleRoundTableRequest - saves user decision', async () => {
  const db = new MockRoundTableDatabaseClient();

  const req = new Request('http://localhost/round-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-123' },
    body: JSON.stringify({
      document_id: 'doc-dilemma-1',
      decision: 'Zdecydowałem się na rozmowę z obecnym szefem i wynegocjowanie nowych warunków.',
    }),
  });

  const res = await handleRoundTableRequest(req, {
    dbClientFactory: () => db,
    aiProvidersFactory: createMockAiProviders,
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(
    db.savedDecisions['doc-dilemma-1'],
    'Zdecydowałem się na rozmowę z obecnym szefem i wynegocjowanie nowych warunków.',
  );
});
