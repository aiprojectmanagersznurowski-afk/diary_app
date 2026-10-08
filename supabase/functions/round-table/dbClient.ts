/* eslint-disable import/no-unresolved */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { IRoundTableDatabaseClient, PersonaRecommendation, NarratorSynthesis, UserContextFileRow } from './types.ts';

export function extractNoteContentFromMarkdown(bodyMd: string): string {
  if (!bodyMd) return '';
  // Usuń nagłówek frontmatter YAML (--- ... ---)
  let text = bodyMd.replace(/^---[\s\S]*?---\n*/, '').trim();
  // Usuń pierwszy nagłówek H1 (# Tytuł) jeśli występuje na początku
  text = text.replace(/^#\s+[^\n]*\n*/, '').trim();
  return text || bodyMd.trim();
}

export function mapDocumentRow(row: Record<string, unknown>): {
  id: string;
  title: string;
  content: string;
  category?: string;
} {
  const docData = (row.data as Record<string, unknown>) || {};
  const title = (row.title as string) || (docData.title as string) || 'Dylemat';
  const bodyMd = (row.body_md as string) || '';
  const contentFromMd = extractNoteContentFromMarkdown(bodyMd);
  const content =
    contentFromMd ||
    (docData.content as string) ||
    (docData.cleanedContent as string) ||
    (docData.reflection as string) ||
    title;

  const categoriesObj = row.categories as { name?: string } | { name?: string }[] | null;
  const categoryName = Array.isArray(categoriesObj)
    ? categoriesObj[0]?.name
    : categoriesObj?.name || (docData.category as string) || undefined;

  return {
    id: row.id as string,
    title,
    content,
    category: categoryName,
  };
}

export class RealRoundTableDatabaseClient implements IRoundTableDatabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getUserId(authHeader?: string): Promise<string | null> {
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;

    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  }

  async getUserProfile(userId: string): Promise<{ aiPersonality: string | null; roundTableMembers: string[] } | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('ai_personality, round_table_members')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      aiPersonality: data.ai_personality ?? null,
      roundTableMembers: (data.round_table_members as string[]) || ['deida', 'huberman'],
    };
  }

  async getDocument(
    userId: string,
    documentId: string,
  ): Promise<{ id: string; content: string; title: string; category?: string } | null> {
    const { data, error } = await this.client
      .from('documents')
      .select('id, title, body_md, data, categories(name)')
      .eq('user_id', userId)
      .eq('id', documentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Błąd odczytu notatki: ${error.message}`);
    }
    if (!data) return null;
    return mapDocumentRow(data as Record<string, unknown>);
  }

  async getUserContextFiles(userId: string): Promise<UserContextFileRow[]> {
    const { data, error } = await this.client
      .from('user_context_files')
      .select('filename, content')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data as UserContextFileRow[];
  }

  async saveAdvisory(
    userId: string,
    advisory: {
      documentId: string;
      problemCore: string;
      rootCauses?: string;
      recommendations: PersonaRecommendation[];
      narratorSynthesis?: NarratorSynthesis;
      crisisDetected: boolean;
      userDecision?: string;
    },
  ): Promise<string> {
    const { data, error } = await this.client
      .from('user_dilemma_advisories')
      .upsert(
        {
          user_id: userId,
          document_id: advisory.documentId,
          problem_core: advisory.problemCore,
          root_causes: advisory.rootCauses ?? null,
          recommendations: advisory.recommendations,
          narrator_synthesis: advisory.narratorSynthesis ?? null,
          crisis_detected: advisory.crisisDetected,
          user_decision: advisory.userDecision ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, document_id' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Błąd zapisu rekomendacji Okrągłego stołu: ${error.message}`);
    }
    return data.id;
  }

  async saveUserDecision(userId: string, documentId: string, decision: string): Promise<void> {
    const { error } = await this.client
      .from('user_dilemma_advisories')
      .update({
        user_decision: decision,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Błąd zapisu decyzji użytkownika: ${error.message}`);
    }
  }

  async appendDilemmaDecisionToContext(userId: string, dilemmaTitle: string, decision: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const lineToAppend = `\n- [${today}] **${dilemmaTitle}**: ${decision} [powiedziane]`;

    const { data: existing } = await this.client
      .from('user_context_files')
      .select('content, version')
      .eq('user_id', userId)
      .eq('filename', 'DILEMMAS.md')
      .maybeSingle();

    if (existing) {
      const updatedContent = `${existing.content.trim()}${lineToAppend}\n`;
      await this.client
        .from('user_context_files')
        .update({
          content: updatedContent,
          version: (existing.version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('filename', 'DILEMMAS.md');
    } else {
      const initialContent = `# Historia dylematów i decyzji\n${lineToAppend}\n`;
      await this.client.from('user_context_files').insert({
        user_id: userId,
        filename: 'DILEMMAS.md',
        content: initialContent,
        version: 1,
      });
    }
  }
}

export function createRoundTableDatabaseClient(authHeader?: string): IRoundTableDatabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  return new RealRoundTableDatabaseClient(client);
}
