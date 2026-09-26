import { GroqSttAdapter, GroqLlmAdapter } from './groq.ts';

Deno.test('GroqSttAdapter - pomyślnie wysyła audio i zwraca transkrypcję', async () => {
  let capturedHeaders: Headers | undefined;
  let capturedBody: any;

  const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders = init?.headers as Headers;
    capturedBody = init?.body;
    return new Response(JSON.stringify({ text: 'To jest próbny tekst pamiętnika.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const adapter = new GroqSttAdapter('dummy-groq-key', 'whisper-large-v3', mockFetch);
  const result = await adapter.transcribe(new Uint8Array([1, 2, 3]), { language: 'pl' });

  if (result !== 'To jest próbny tekst pamiętnika.') {
    throw new Error(`Nieprawidłowy wynik transkrypcji: ${result}`);
  }
  if (!capturedHeaders) {
    throw new Error('Oczekiwano nagłówków w żądaniu STT');
  }
  if (!capturedBody || !(capturedBody instanceof FormData)) {
    throw new Error('Oczekiwano FormData w ciele żądania STT');
  }
});

Deno.test('GroqSttAdapter - rzuca błąd przy odpowiedzi serwera 400/500', async () => {
  const mockFetch = async () => {
    return new Response('Invalid audio format', { status: 400 });
  };

  const adapter = new GroqSttAdapter('dummy-groq-key', 'whisper-large-v3', mockFetch);
  let errorCaught = false;

  try {
    await adapter.transcribe(new Uint8Array([1]));
  } catch (err) {
    errorCaught = true;
    if (!String(err).includes('Błąd Groq STT (400)')) {
      throw new Error(`Oczekiwano błędu z kodem 400, otrzymano: ${err}`);
    }
  }

  if (!errorCaught) {
    throw new Error('Oczekiwano rzucenia błędu');
  }
});

Deno.test('GroqLlmAdapter - pomyślnie generuje tekst i format JSON', async () => {
  let lastRequestBody: any;

  const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    lastRequestBody = JSON.parse(init?.body as string);
    if (lastRequestBody.response_format?.type === 'json_object') {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ summary: 'Podsumowanie dnia' }) } }],
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: 'Wspaniały dzień.' } }],
      }),
      { status: 200 },
    );
  };

  const adapter = new GroqLlmAdapter('dummy-groq-key', 'llama-3.3-70b-versatile', mockFetch);

  // 1. Zwykły tekst
  const textResult = await adapter.generateText([{ role: 'user', content: 'Cześć' }]);
  if (textResult !== 'Wspaniały dzień.') {
    throw new Error(`Nieprawidłowy tekst: ${textResult}`);
  }

  // 2. Format JSON
  const jsonResult = await adapter.generateJson<{ summary: string }>([{ role: 'user', content: 'Daj JSON' }]);
  if (jsonResult.summary !== 'Podsumowanie dnia') {
    throw new Error(`Nieprawidłowy JSON: ${JSON.stringify(jsonResult)}`);
  }
  if (lastRequestBody.response_format?.type !== 'json_object') {
    throw new Error('Oczekiwano response_format: json_object');
  }
});

Deno.test('GroqLlmAdapter - rzuca błąd przy niepoprawnym formacie JSON w generateJson', async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: 'nie-json-tekst' } }],
      }),
      { status: 200 },
    );
  };

  const adapter = new GroqLlmAdapter('dummy-groq-key', 'llama-3.3-70b-versatile', mockFetch);
  let errorCaught = false;

  try {
    await adapter.generateJson([{ role: 'user', content: 'Daj JSON' }]);
  } catch (err) {
    errorCaught = true;
    if (!String(err).includes('nie jest poprawnym formatem JSON')) {
      throw new Error(`Oczekiwano komunikatu o błędzie JSON, otrzymano: ${err}`);
    }
  }

  if (!errorCaught) {
    throw new Error('Oczekiwano rzucenia wyjątku przy złym JSONie');
  }
});

Deno.test('GroqLlmAdapter - streamText poprawnie czyta strumień SSE', async () => {
  const sseData =
    'data: {"choices":[{"delta":{"content":"Ala "}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":"ma "}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":"kota."}}]}\n\n' +
    'data: [DONE]\n\n';

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sseData));
      controller.close();
    },
  });

  const mockFetch = async () => {
    return new Response(stream, { status: 200 });
  };

  const adapter = new GroqLlmAdapter('dummy-groq-key', 'llama-3.3-70b-versatile', mockFetch);
  const chunks: string[] = [];

  for await (const chunk of adapter.streamText([{ role: 'user', content: 'Napisz coś' }])) {
    chunks.push(chunk);
  }

  const fullText = chunks.join('');
  if (fullText !== 'Ala ma kota.') {
    throw new Error(`Nieprawidłowy tekst ze strumienia: ${fullText}`);
  }
});
