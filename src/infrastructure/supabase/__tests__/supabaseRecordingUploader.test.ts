import { SupabaseRecordingUploader } from '../supabaseRecordingUploader';
import { QueuedRecording } from '../../../domain/models/QueuedRecording';
import { ProcessRecordingQueueUseCase } from '../../../application/useCases/recording/processRecordingQueueUseCase';
import { IRecordingQueue } from '../../../domain/services/IRecordingQueue';
import { IFileStorage } from '../../../domain/services/IFileStorage';

describe('SupabaseRecordingUploader', () => {
  const dummyUser = { id: 'user-uuid-123', email: 'user@example.com' };

  const sampleRecording: QueuedRecording = {
    id: 'rec-uuid-456',
    path: 'file:///app/documents/recordings/rec-uuid-456.m4a',
    recordedAt: '2026-09-26T10:15:00.000Z',
    durationMs: 7500,
    source: 'phone',
    status: 'pending',
    attempts: 0,
    nextAttemptAt: '2026-09-26T10:15:00.000Z',
    lastError: null,
  };

  let mockUpload: jest.Mock;
  let mockInsert: jest.Mock;
  let mockGetUser: jest.Mock;
  let mockSupabase: any;
  let mockFileReader: jest.Mock;

  beforeEach(() => {
    mockUpload = jest.fn().mockResolvedValue({ data: { path: 'uploaded-path' }, error: null });
    mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockGetUser = jest.fn().mockResolvedValue({ data: { user: dummyUser }, error: null });
    mockFileReader = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    mockSupabase = {
      auth: {
        getUser: mockGetUser,
      },
      storage: {
        from: jest.fn().mockReturnValue({
          upload: mockUpload,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert: mockInsert,
      }),
    };
  });

  it('pomyślnie wysyła plik do Storage (upsert) i wykonuje INSERT recordings', async () => {
    const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);

    await uploader.upload(sampleRecording);

    // 1. Sprawdzenie uploadu do Storage
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('recordings');
    expect(mockUpload).toHaveBeenCalledWith('user-uuid-123/rec-uuid-456.m4a', expect.any(Uint8Array), {
      contentType: 'audio/m4a',
      upsert: true,
    });

    // 2. Sprawdzenie zapisu w tabeli recordings
    expect(mockSupabase.from).toHaveBeenCalledWith('recordings');
    expect(mockInsert).toHaveBeenCalledWith({
      id: 'rec-uuid-456',
      user_id: 'user-uuid-123',
      source: 'phone',
      recorded_at: '2026-09-26T10:15:00.000Z',
      duration_ms: 7500,
      audio_path: 'user-uuid-123/rec-uuid-456.m4a',
      status: 'uploaded',
      attempts: 0,
    });
  });

  describe('Kryterium: Konflikt klucza traktowany jako sukces (idempotencja)', () => {
    it('traktuje błąd 23505 (unique_violation) jako sukces ponowienia', async () => {
      mockInsert.mockResolvedValueOnce({
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "recordings_pkey"',
        },
      });

      const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);

      // Nie powinno rzucić wyjątku
      await expect(uploader.upload(sampleRecording)).resolves.toBeUndefined();
    });

    it('traktuje komunikat duplicate key jako sukces ponowienia', async () => {
      mockInsert.mockResolvedValueOnce({
        error: {
          message: 'Key (id)=(rec-uuid-456) already exists.',
        },
      });

      const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);

      await expect(uploader.upload(sampleRecording)).resolves.toBeUndefined();
    });
  });

  describe('Kryterium: Błąd uploadu zostawia nagranie w kolejce', () => {
    it('rzuca błąd gdy upload do Storage się nie powiedzie', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network request failed' },
      });

      const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);

      await expect(uploader.upload(sampleRecording)).rejects.toThrow('Błąd uploadu do Storage: Network request failed');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rzuca błąd gdy INSERT do bazy zwróci inny błąd niż unikalność klucza', async () => {
      mockInsert.mockResolvedValueOnce({
        error: {
          code: '42501',
          message: 'permission denied for table recordings',
        },
      });

      const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);

      await expect(uploader.upload(sampleRecording)).rejects.toThrow(
        'Błąd zapisu do tabeli recordings: permission denied for table recordings',
      );
    });

    it('współpraca z ProcessRecordingQueueUseCase: przy błędzie uploadu nagranie zostaje w kolejce i plik nie znika', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: '503 Service Unavailable' },
      });

      const mockQueue: jest.Mocked<IRecordingQueue> = {
        enqueue: jest.fn(),
        getPending: jest.fn().mockResolvedValue([sampleRecording]),
        getById: jest.fn().mockResolvedValue(sampleRecording),
        getAll: jest.fn(),
        markUploading: jest.fn().mockResolvedValue(undefined),
        markSuccess: jest.fn().mockResolvedValue(undefined),
        markFailed: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      const mockStorage: jest.Mocked<IFileStorage> = {
        moveToPermanent: jest.fn(),
        deleteFile: jest.fn().mockResolvedValue(undefined),
        fileExists: jest.fn().mockResolvedValue(true),
      };

      const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);
      const queueProcessor = new ProcessRecordingQueueUseCase(mockQueue, uploader, mockStorage);

      const result = await queueProcessor.processPending();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);

      // Plik NIE został skasowany z dysku
      expect(mockStorage.deleteFile).not.toHaveBeenCalled();

      // Wpis NIE został usunięty z kolejki
      expect(mockQueue.remove).not.toHaveBeenCalled();

      // Kolejka oznaczyła nieudaną próbę
      expect(mockQueue.markFailed).toHaveBeenCalledWith(
        sampleRecording.id,
        expect.stringContaining('503 Service Unavailable'),
        expect.any(String),
        1,
      );
    });
  });

  describe('Autentykacja', () => {
    it('rzuca błąd gdy użytkownik nie jest zalogowany', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const uploader = new SupabaseRecordingUploader(mockSupabase, mockFileReader);

      await expect(uploader.upload(sampleRecording)).rejects.toThrow('Brak aktywnej sesji użytkownika');
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });
});
