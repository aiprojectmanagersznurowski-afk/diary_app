import { createBuildDailyClient } from './dbClient.ts';
import { createAiProviders, AiProviders } from '../_shared/ai/factory.ts';
import { buildDailySingle } from '../_shared/pipeline/buildDaily.ts';
import { IBuildDailyDatabaseClient } from '../_shared/db/types.ts';

export interface HandlerDependencies {
  dbClientFactory?: () => IBuildDailyDatabaseClient;
  aiProvidersFactory?: () => AiProviders;
}

export async function handleBuildDailyRequest(req: Request, deps?: HandlerDependencies): Promise<Response> {
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

    const userId = body.user_id as string | undefined;
    const day = body.day as string | undefined;

    if (!userId || typeof userId !== 'string' || !day || typeof day !== 'string') {
      return new Response(JSON.stringify({ error: 'Brak wymaganych pól user_id i day' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = deps?.dbClientFactory ? deps.dbClientFactory() : createBuildDailyClient();
    const aiProviders = deps?.aiProvidersFactory ? deps.aiProvidersFactory() : createAiProviders();

    const result = await buildDailySingle({ userId, day, db, aiProviders });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Supabase Edge Function runtime server
if (import.meta.main) {
  Deno.serve((req: Request) => handleBuildDailyRequest(req));
}
