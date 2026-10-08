import { SupabaseClient } from '@supabase/supabase-js';
import { IDilemmaAdvisoryRepository } from '../../domain/repositories/IDilemmaAdvisoryRepository';
import { DilemmaAdvisory } from '../../domain/models/DilemmaAdvisory';
import { loadAppConfig, ConfigError } from '../config/appConfig';

export class SupabaseDilemmaAdvisoryRepository implements IDilemmaAdvisoryRepository {
  constructor(
    private client: SupabaseClient,
    private fetchFn: typeof fetch = fetch,
  ) {}

  private async getAuthToken(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token || null;
  }

  private getEndpointAndKey(): { endpoint: string; apikey: string } {
    let supabaseUrl: string | undefined = (this.client as any).supabaseUrl;
    let supabaseKey: string | undefined = (this.client as any).supabaseKey;
    if (!supabaseUrl || !supabaseKey) {
      const { config, issues } = loadAppConfig();
      if (!config) throw new ConfigError(issues);
      supabaseUrl = supabaseUrl || config.supabaseUrl;
      supabaseKey = supabaseKey || config.supabaseAnonKey;
    }
    return {
      endpoint: `${supabaseUrl}/functions/v1/round-table`,
      apikey: supabaseKey,
    };
  }

  async getAdvisory(documentId: string): Promise<DilemmaAdvisory | null> {
    const { data, error } = await this.client
      .from('user_dilemma_advisories')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      documentId: data.document_id,
      problemCore: data.problem_core,
      rootCauses: data.root_causes,
      recommendations: data.recommendations || [],
      narratorSynthesis: data.narrator_synthesis,
      crisisDetected: Boolean(data.crisis_detected),
      userDecision: data.user_decision,
      createdAt: data.created_at,
    };
  }

  async requestAdvisory(documentId: string, members?: string[]): Promise<DilemmaAdvisory> {
    const token = await this.getAuthToken();
    const { endpoint, apikey } = this.getEndpointAndKey();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey,
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.fetchFn(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document_id: documentId,
        members,
      }),
    });

    if (!res.ok) {
      let msg = `Błąd generowania Okrągłego stołu (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error) msg = errJson.error;
      } catch {
        // Ignoruj błąd parsowania
      }
      throw new Error(msg);
    }

    const data = await res.json();
    return {
      id: data.id,
      documentId: data.documentId || documentId,
      problemCore: data.problemCore,
      rootCauses: data.rootCauses,
      recommendations: data.recommendations || [],
      narratorSynthesis: data.narratorSynthesis,
      crisisDetected: Boolean(data.crisisDetected),
      crisisMessage: data.crisisMessage,
      helplines: data.helplines,
      userDecision: data.userDecision,
    };
  }

  async saveUserDecision(documentId: string, decision: string): Promise<void> {
    const token = await this.getAuthToken();
    const { endpoint, apikey } = this.getEndpointAndKey();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey,
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.fetchFn(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document_id: documentId,
        decision,
      }),
    });

    if (!res.ok) {
      let msg = `Błąd zapisu decyzji (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error) msg = errJson.error;
      } catch {
        // Ignoruj błąd
      }
      throw new Error(msg);
    }
  }
}
