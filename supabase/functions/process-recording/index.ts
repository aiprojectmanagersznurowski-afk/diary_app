import { createSupabaseClients } from '../_shared/db/supabaseClient.ts';
import { createAiProviders, AiProviders } from '../_shared/ai/factory.ts';
import { processRecordingPipeline } from '../_shared/pipeline/processRecording.ts';
import { IDatabaseClient, IStorageClient } from '../_shared/db/types.ts';

export interface HandlerDependencies {
  dbClientFactory?: () => { db: IDatabaseClient; storage: IStorageClient };
  aiProvidersFactory?: () => AiProviders;
}

export async function handleProcessRecordingRequest(req: Request, deps?: HandlerDependencies): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoda niedozwolona' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Niepoprawny format JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recordObj = body.record as Record<string, unknown> | undefined;
    const recordingId = (body.recording_id || recordObj?.id || body.id) as string | undefined;

    if (!recordingId || typeof recordingId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Brak wymaganego identyfikatora nagrania (recording_id lub record.id)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const clients = deps?.dbClientFactory ? deps.dbClientFactory() : createSupabaseClients();
    const aiProviders = deps?.aiProvidersFactory ? deps.aiProvidersFactory() : createAiProviders();

    const result = await processRecordingPipeline({
      recordingId,
      db: clients.db,
      storage: clients.storage,
      aiProviders,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

// Supabase Edge Function runtime server
if (import.meta.main) {
  Deno.serve((req: Request) => handleProcessRecordingRequest(req));
}
