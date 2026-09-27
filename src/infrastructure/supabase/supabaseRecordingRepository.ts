import { SupabaseClient } from '@supabase/supabase-js';
import { IRecordingRepository } from '../../domain/repositories/IRecordingRepository';
import { Recording, RecordingStatus } from '../../domain/models/Recording';

export class SupabaseRecordingRepository implements IRecordingRepository {
  constructor(private client: SupabaseClient) {}

  async getRecordings(): Promise<Recording[]> {
    const { data, error } = await this.client
      .from('recordings')
      .select(
        'id, user_id, source, recorded_at, duration_ms, audio_path, raw_transcript, status, attempts, last_error, created_at',
      )
      .order('recorded_at', { ascending: false });

    if (error) {
      throw new Error(`Błąd pobierania nagrań: ${error.message}`);
    }

    return (data || []).map(mapRowToRecording);
  }

  async retryRecording(id: string): Promise<void> {
    // Ustawienie statusu do ponownego przetworzenia (bez wywołań AI z klienta)
    const { error } = await this.client
      .from('recordings')
      .update({
        status: 'uploaded',
        last_error: null,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Błąd ponowienia nagrania ${id}: ${error.message}`);
    }

    // Bezpośrednie wywołanie Edge Function w tle w celu natychmiastowego przetworzenia (opcjonalne, bez blokowania)
    this.client.functions
      .invoke('process-recording', {
        body: { recording_id: id },
      })
      .catch(() => {
        // Jeśli wywołanie Edge Function z klienta się nie powiedzie, pg_cron ponowi przetwarzanie
      });
  }

  subscribeToRecordings(userId: string, onUpdate: (recording: Recording) => void): () => void {
    const channel = this.client
      .channel(`recordings-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as Record<string, any>;
            if (row.id && row.user_id) {
              onUpdate(mapRowToRecording(row));
            }
          }
        },
      )
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

export function mapRowToRecording(row: Record<string, any>): Recording {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source || 'phone',
    recordedAt: row.recorded_at,
    durationMs: row.duration_ms,
    audioPath: row.audio_path,
    rawTranscript: row.raw_transcript,
    status: (row.status as RecordingStatus) || 'uploaded',
    attempts: row.attempts ?? 0,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}
