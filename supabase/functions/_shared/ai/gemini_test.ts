import { GeminiLlmAdapter, GeminiEmbeddingAdapter } from './gemini.ts';

Deno.test('GeminiLlmAdapter - generuje tekst z mapowaniem ról system i user', async () => {
  let capturedBody: any;

  const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: 'Odpowiedź Gemini.' }],
            },
          },
        ],
      }),
      { status: 200 },
    );
  };

  const adapter = new GeminiLlmAdapter('dummy-gemini-key', 'gemini-2.0-flash', mockFetch);
  const result = await adapter.generateText([
    { role: 'system', content: 'Jesteś przyjaznym asystentem.' },
    { role: 'user', content: 'Co słychać?' },
  ]);

  if (result !== 'Odpowiedź Gemini.') {
    throw new Error(`Nieprawidłowa odpowiedź: ${result}`);
  }
  if (capturedBody.systemInstruction?.parts?.[0]?.text !== 'Jesteś przyjaznym asystentem.') {
    throw new Error('Błędne zmapowanie systemInstruction w żądaniu');
  }
  if (capturedBody.contents?.[0]?.parts?.[0]?.text !== 'Co słychać?') {
    throw new Error('Błędne zmapowanie contents w żądaniu');
  }
});

Deno.test('GeminiLlmAdapter - generuje format JSON z responseMimeType', async () => {
  let capturedBody: any;

  const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ score: 10 }) }],
            },
          },
        ],
      }),
      { status: 200 },
    );
  };

  const adapter = new GeminiLlmAdapter('dummy-gemini-key', 'gemini-2.0-flash', mockFetch);
  const jsonResult = await adapter.generateJson<{ score: number }>([{ role: 'user', content: 'Oceń' }]);

  if (jsonResult.score !== 10) {
    throw new Error(`Nieprawidłowy JSON: ${JSON.stringify(jsonResult)}`);
  }
  if (capturedBody.generationConfig?.responseMimeType !== 'application/json') {
    throw new Error('Oczekiwano responseMimeType: application/json w generationConfig');
  }
});

Deno.test('GeminiEmbeddingAdapter - pomyślnie zwraca wektor o długości 1536 (EMBED_DIM)', async () => {
  let capturedBody: any;
  const dummyVector1536 = new Array(1536).fill(0.0123);

  const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string);
    return new Response(
      JSON.stringify({
        embedding: {
          values: dummyVector1536,
        },
      }),
      { status: 200 },
    );
  };

  const adapter = new GeminiEmbeddingAdapter('dummy-gemini-key', 'gemini-embedding-001', 1536, mockFetch);
  const vector = await adapter.embed('Testowy tekst do embeddingu');

  if (vector.length !== 1536) {
    throw new Error(`Oczekiwano wymiaru 1536, otrzymano ${vector.length}`);
  }
  if (capturedBody.outputDimensionality !== 1536) {
    throw new Error(
      `Oczekiwano outputDimensionality: 1536 w ciele żądania, otrzymano ${capturedBody.outputDimensionality}`,
    );
  }
});

Deno.test('GeminiEmbeddingAdapter - rzuca błąd gdy długość wektora różni się od EMBED_DIM', async () => {
  // Symulujemy nieprawidłową odpowiedź (np. model zwrócił 768 zamiast 1536)
  const dummyVector768 = new Array(768).fill(0.5);

  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        embedding: {
          values: dummyVector768,
        },
      }),
      { status: 200 },
    );
  };

  const adapter = new GeminiEmbeddingAdapter('dummy-gemini-key', 'gemini-embedding-001', 1536, mockFetch);
  let errorCaught = false;

  try {
    await adapter.embed('Tekst');
  } catch (err) {
    errorCaught = true;
    if (!String(err).includes('Niezgodność wymiaru embeddingu')) {
      throw new Error(`Oczekiwano błędu o niezgodności wymiaru, otrzymano: ${err}`);
    }
  }

  if (!errorCaught) {
    throw new Error('Oczekiwano rzucenia błędu przy niezgodnym wymiarze embeddingu');
  }
});

Deno.test('GeminiEmbeddingAdapter - embedBatch weryfikuje każdy wektor i zwraca listę', async () => {
  const dummyVector1536 = new Array(1536).fill(0.1);

  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        embeddings: [{ values: dummyVector1536 }, { values: dummyVector1536 }],
      }),
      { status: 200 },
    );
  };

  const adapter = new GeminiEmbeddingAdapter('dummy-gemini-key', 'gemini-embedding-001', 1536, mockFetch);
  const result = await adapter.embedBatch(['tekst 1', 'tekst 2']);

  if (result.length !== 2) {
    throw new Error(`Oczekiwano 2 embeddingów, otrzymano ${result.length}`);
  }
  if (result[0].length !== 1536 || result[1].length !== 1536) {
    throw new Error('Embeddingi w batchu nie mają wymiaru 1536');
  }
});
