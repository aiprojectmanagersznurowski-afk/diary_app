import { SupabaseClient } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import { IRecordingUploader } from '../../domain/services/IRecordingUploader';
import { QueuedRecording } from '../../domain/models/QueuedRecording';

export type FileReaderFn = (path: string) => Promise<Uint8Array | FormData | Blob | ArrayBuffer>;

export class SupabaseRecordingUploader implements IRecordingUploader {
  constructor(
    private supabase: SupabaseClient,
    private fileReader: FileReaderFn = defaultFileReader,
  ) {}

  async upload(recording: QueuedRecording): Promise<void> {
    // 1. Pobieramy bieżącego użytkownika (wymagane przez RLS)
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Brak aktywnej sesji użytkownika do wysyłki nagrania');
    }

    const storagePath = `${user.id}/${recording.id}.m4a`;

    // 2. Odczytujemy zawartość pliku audio
    const fileData = await this.fileReader(recording.path);

    // 3. Upload pliku do bucketu 'recordings' w Supabase Storage
    // upsert: true zapewnia brak powielania plików w przypadku ponowienia
    const { error: storageError } = await this.supabase.storage.from('recordings').upload(storagePath, fileData, {
      contentType: 'audio/m4a',
      upsert: true,
    });

    if (storageError) {
      throw new Error(`Błąd uploadu do Storage: ${storageError.message}`);
    }

    // 4. INSERT do tabeli public.recordings
    const { error: dbError } = await this.supabase.from('recordings').insert({
      id: recording.id,
      user_id: user.id,
      source: recording.source,
      recorded_at: recording.recordedAt,
      duration_ms: recording.durationMs,
      audio_path: storagePath,
      status: 'uploaded',
      attempts: 0,
    });

    if (dbError) {
      // Postgres error code 23505 = unique_violation (klucz główny id już istnieje)
      const isKeyConflict =
        dbError.code === '23505' ||
        dbError.message?.includes('duplicate key') ||
        dbError.message?.includes('already exists');

      if (isKeyConflict) {
        // Idempotencja: nagranie już istnieje w bazie (sukces)
        return;
      }

      throw new Error(`Błąd zapisu do tabeli recordings: ${dbError.message}`);
    }
  }
}

async function defaultFileReader(path: string): Promise<Uint8Array | FormData> {
  if (typeof File === 'function') {
    try {
      const file = new File(path);
      if (file.exists) {
        const bytes = await file.bytes();
        return bytes;
      }
    } catch {
      // fallback do FormData
    }
  }

  const formData = new FormData();
  formData.append('file', {
    uri: path,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as any);
  return formData;
}
