import { createAiProviders, AiProviders } from '../_shared/ai/factory.ts';
import { createRoundTableDatabaseClient } from './dbClient.ts';
import { checkCrisis } from './safety.ts';
import { orchestrateRoundTable } from './orchestrator.ts';
import { IRoundTableDatabaseClient, RoundTableRequestBody, RoundTableResult } from './types.ts';

export interface HandlerDependencies {
  dbClientFactory?: (authHeader?: string) => IRoundTableDatabaseClient;
  aiProvidersFactory?: () => AiProviders;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handleRoundTableRequest(req: Request, deps?: HandlerDependencies): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoda niedozwolona' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: RoundTableRequestBody;
  try {
    const raw = await req.json();
    body = raw as RoundTableRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Niepoprawny format JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') || undefined;
  const db = deps?.dbClientFactory ? deps.dbClientFactory(authHeader) : createRoundTableDatabaseClient(authHeader);
  const aiProviders = deps?.aiProvidersFactory ? deps.aiProvidersFactory() : createAiProviders();

  const userId = await db.getUserId(authHeader);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 1. Zapis wyboru / decyzji użytkownika
  if (body.decision && body.document_id) {
    const doc = await db.getDocument(userId, body.document_id);
    await db.saveUserDecision(userId, body.document_id, body.decision);
    await db.appendDilemmaDecisionToContext(userId, doc?.title || 'Dylemat', body.decision);

    return new Response(JSON.stringify({ success: true, savedDecision: body.decision }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 2. Ustalenie treści dylematu
  let dilemmaText = body.dilemma_text?.trim() || '';

  if (body.document_id) {
    const doc = await db.getDocument(userId, body.document_id);
    if (doc && !dilemmaText) {
      dilemmaText = doc.content;
    }
  }

  if (!dilemmaText) {
    return new Response(JSON.stringify({ error: 'Brak treści dylematu (podaj document_id lub dilemma_text)' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 3. Filtr bezpieczeństwa kryzysowego (Safety Gate)
  const safety = checkCrisis(dilemmaText);
  if (safety.isCrisis) {
    const crisisResult: RoundTableResult = {
      documentId: body.document_id,
      problemCore: 'Wykryto sytuację kryzysu emocjonalnego.',
      recommendations: [],
      crisisDetected: true,
      crisisMessage: safety.message,
      helplines: safety.helplines,
    };

    if (body.document_id) {
      await db.saveAdvisory(userId, {
        documentId: body.document_id,
        problemCore: crisisResult.problemCore,
        recommendations: [],
        crisisDetected: true,
      });
    }

    return new Response(JSON.stringify(crisisResult), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 4. Pobranie profilu (osobowość narratora i skład stołu) oraz plików kontekstu
  const profile = await db.getUserProfile(userId);
  const members =
    body.members && body.members.length > 0
      ? body.members
      : profile?.roundTableMembers && profile.roundTableMembers.length > 0
        ? profile.roundTableMembers
        : ['deida', 'huberman'];
  const narratorKey = profile?.aiPersonality || 'friend';

  const contextFiles = await db.getUserContextFiles(userId);

  // 5. Orkiestracja Okrągłego stołu
  const advisory = await orchestrateRoundTable({
    dilemmaText,
    members,
    narratorKey,
    contextFiles,
    aiProviders,
  });

  if (body.document_id) {
    advisory.documentId = body.document_id;
    const advisoryId = await db.saveAdvisory(userId, {
      documentId: body.document_id,
      problemCore: advisory.problemCore,
      rootCauses: advisory.rootCauses,
      recommendations: advisory.recommendations,
      narratorSynthesis: advisory.narratorSynthesis,
      crisisDetected: false,
    });
    advisory.id = advisoryId;
  }

  return new Response(JSON.stringify(advisory), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Główny handler Deno Deploy
if (import.meta.main) {
  Deno.serve((req: Request) => handleRoundTableRequest(req));
}
