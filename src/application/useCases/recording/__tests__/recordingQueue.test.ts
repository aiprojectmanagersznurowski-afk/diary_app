import { EnqueueRecordingUseCase } from '../enqueueRecordingUseCase';
import { ProcessRecordingQueueUseCase } from '../processRecordingQueueUseCase';
import { RecordAndProcessEntryUseCase } from '../../recordAndProcess';
import { IRecordingQueue } from '../../../../domain/services/IRecordingQueue';
import { IFileStorage } from '../../../../domain/services/IFileStorage';
import { IRecordingUploader } from '../../../../domain/services/IRecordingUploader';
import { QueuedRecording, NewQueuedRecording } from '../../../../domain/models/QueuedRecording';
import { IAudioRecorder } from '../../../../domain/services/IAudioRecorder';
import { IAiService } from '../../../../domain/services/IAiService';
import { IDiaryRepository } from '../../../../domain/repositories/IDiaryRepository';

class InMemoryRecordingQueue implements IRecordingQueue {
  public recordings: Map<string, QueuedRecording> = new Map();

  async enqueue(recording: NewQueuedRecording): Promise<QueuedRecording> {
    const item: QueuedRecording = {
      ...recording,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
      lastError: null,
    };
    this.recordings.set(item.id, item);
    return { ...item };
  }

  async getPending(now: Date = new Date()): Promise<QueuedRecording[]> {
    const nowIso = now.toISOString();
    return Array.from(this.recordings.values()).filter(
      (r) => r.status === 'pending' && (r.nextAttemptAt === null || r.nextAttemptAt <= nowIso),
    );
  }

  async getById(id: string): Promise<QueuedRecording | null> {
    const item = this.recordings.get(id);
    return item ? { ...item } : null;
  }

  async getAll(): Promise<QueuedRecording[]> {
    return Array.from(this.recordings.values());
  }

  async markUploading(id: string): Promise<void> {
    const item = this.recordings.get(id);
    if (item) {
      item.status = 'uploading';
    }
  }

  async markSuccess(id: string): Promise<void> {
    const item = this.recordings.get(id);
    if (item) {
      item.status = 'uploaded';
      item.nextAttemptAt = null;
    }
  }

  async markFailed(id: string, error: string, nextAttemptAt: string | null, attempts: number): Promise<void> {
    const item = this.recordings.get(id);
    if (item) {
      item.status = nextAttemptAt === null ? 'failed' : 'pending';
      item.attempts = attempts;
      item.nextAttemptAt = nextAttemptAt;
      item.lastError = error;
    }
  }

  async remove(id: string): Promise<void> {
    this.recordings.delete(id);
  }
}

class MockFileStorage implements IFileStorage {
  public files: Map<string, boolean> = new Map();

  async moveToPermanent(tempUri: string, id: string): Promise<string> {
    const permanentPath = `file:///app/documents/recordings/${id}.m4a`;
    this.files.set(permanentPath, true);
    return permanentPath;
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }
}

class MockUploader implements IRecordingUploader {
  public shouldFail = false;
  public uploadCalls: QueuedRecording[] = [];

  async upload(recording: QueuedRecording): Promise<void> {
    this.uploadCalls.push({ ...recording });
    if (this.shouldFail) {
      throw new Error('Błąd połączenia z serwerem');
    }
  }
}

describe('Recording Queue & Offline Reliability', () => {
  let queue: InMemoryRecordingQueue;
  let fileStorage: MockFileStorage;
  let uploader: MockUploader;
  let enqueueUseCase: EnqueueRecordingUseCase;
  let processQueueUseCase: ProcessRecordingQueueUseCase;

  beforeEach(() => {
    queue = new InMemoryRecordingQueue();
    fileStorage = new MockFileStorage();
    uploader = new MockUploader();
    enqueueUseCase = new EnqueueRecordingUseCase(queue, fileStorage, () => 'fixed-uuid-123');
    processQueueUseCase = new ProcessRecordingQueueUseCase(queue, uploader, fileStorage, {
      baseDelayMs: 1000,
      maxDelayMs: 60000,
      maxAttempts: 3,
    });
  });

  describe('Kryterium 1: Nagranie trafia do kolejki zanim cokolwiek zostanie wysłane', () => {
    it('tworzy trwały plik i zapisuje nagranie w kolejce ze statusem pending', async () => {
      const queued = await enqueueUseCase.execute({
        tempUri: 'file:///cache/temp-rec.m4a',
        durationMs: 15000,
        source: 'phone',
      });

      expect(queued.id).toBe('fixed-uuid-123');
      expect(queued.status).toBe('pending');
      expect(queued.attempts).toBe(0);
      expect(queued.path).toBe('file:///app/documents/recordings/fixed-uuid-123.m4a');

      // Plik jest trwale zapisany w pamięci
      expect(await fileStorage.fileExists(queued.path)).toBe(true);

      // Wpis istnieje w kolejce zanim uploader w ogóle został wywołany
      const inQueue = await queue.getById('fixed-uuid-123');
      expect(inQueue).toBeDefined();
      expect(uploader.uploadCalls).toHaveLength(0);
    });
  });

  describe('Kryterium 2: Brak usunięcia pliku przy błędzie oraz odstęp wykładniczy i limit prób', () => {
    it('nie usuwa pliku audio i ustawia odstęp wykładniczy przy nieudanym uploadzie', async () => {
      const queued = await enqueueUseCase.execute({
        tempUri: 'file:///cache/temp-rec.m4a',
        durationMs: 5000,
      });

      // Ustawiamy błąd wysyłki
      uploader.shouldFail = true;

      const result = await processQueueUseCase.processPending();
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);

      // Plik audio nadal istnieje na dysku!
      expect(await fileStorage.fileExists(queued.path)).toBe(true);

      // Kolejka odnotowała nieudaną próbę (attempts = 1)
      const afterFail = await queue.getById(queued.id);
      expect(afterFail?.attempts).toBe(1);
      expect(afterFail?.status).toBe('pending');
      expect(afterFail?.lastError).toContain('Błąd połączenia z serwerem');
      expect(afterFail?.nextAttemptAt).not.toBeNull();
    });

    it('po osiągnięciu limitu prób (maxAttempts) przechodzi w status failed i nie usuwa pliku', async () => {
      const queued = await enqueueUseCase.execute({
        tempUri: 'file:///cache/temp-rec.m4a',
        durationMs: 5000,
      });
      uploader.shouldFail = true;

      // 1. próba
      await processQueueUseCase.processPending();
      let item = await queue.getById(queued.id);
      expect(item?.attempts).toBe(1);
      expect(item?.status).toBe('pending');

      // Symulujemy czas kolejnej próby i drugie podejście
      await queue.markFailed(queued.id, 'Err', new Date().toISOString(), 1);
      await processQueueUseCase.processPending();
      item = await queue.getById(queued.id);
      expect(item?.attempts).toBe(2);

      // 3. próba (maxAttempts = 3)
      await queue.markFailed(queued.id, 'Err', new Date().toISOString(), 2);
      await processQueueUseCase.processPending();
      item = await queue.getById(queued.id);
      expect(item?.attempts).toBe(3);
      expect(item?.status).toBe('failed');
      expect(item?.nextAttemptAt).toBeNull();

      // Plik wciąż nie jest usunięty!
      expect(await fileStorage.fileExists(queued.path)).toBe(true);
    });

    it('usuwa plik z dysku i usuwa wpis z kolejki dopiero po pomyślnym uploadzie', async () => {
      const queued = await enqueueUseCase.execute({
        tempUri: 'file:///cache/temp-rec.m4a',
        durationMs: 8000,
      });

      uploader.shouldFail = false;
      const result = await processQueueUseCase.processPending();

      expect(result.succeeded).toBe(1);
      expect(await fileStorage.fileExists(queued.path)).toBe(false);

      const inQueue = await queue.getById(queued.id);
      expect(inQueue).toBeNull();
    });
  });

  describe('Kryterium 3: Idempotentne ponowienie (retry)', () => {
    it('pozwala ręcznie ponowić nagranie ze statusem failed i po sukcesie usuwa plik', async () => {
      const queued = await enqueueUseCase.execute({
        tempUri: 'file:///cache/temp-rec.m4a',
        durationMs: 5000,
      });

      // Ustawiamy status failed
      await queue.markFailed(queued.id, 'Connection timeout', null, 3);
      uploader.shouldFail = false; // Sieć wróciła

      const retrySuccess = await processQueueUseCase.retry(queued.id);
      expect(retrySuccess).toBe(true);

      // Plik usunięty, wpis z kolejki wyczyszczony
      expect(await fileStorage.fileExists(queued.path)).toBe(false);
      expect(await queue.getById(queued.id)).toBeNull();
    });

    it('ignoruje próbę ponowienia nieistniejącego id', async () => {
      const result = await processQueueUseCase.retry('non-existing-id');
      expect(result).toBe(false);
    });
  });

  describe('Fix: useDiaryStore / RecordAndProcessEntryUseCase nie gubi nagrania przy błędzie AI', () => {
    it('zabezpiecza nagranie w kolejce zanim rozpocznie transkrypcję AI i zachowuje je przy awarii', async () => {
      const mockRecorder: jest.Mocked<IAudioRecorder> = {
        startRecording: jest.fn().mockResolvedValue(undefined),
        stopRecording: jest.fn().mockResolvedValue('file:///cache/new-recording.m4a'),
        getCurrentMetering: jest.fn().mockReturnValue(-10),
        getRecordingDuration: jest.fn().mockReturnValue(12000),
      };

      const mockAi: jest.Mocked<IAiService> = {
        transcribe: jest.fn().mockRejectedValue(new Error('AI Service 503 Unavailable')),
        extractData: jest.fn(),
        extractLifeGoalsFromTranscript: jest.fn(),
      };

      const mockRepo: jest.Mocked<IDiaryRepository> = {
        save: jest.fn(),
        update: jest.fn(),
        findByDate: jest.fn(),
        getAll: jest.fn(),
      };

      const recordUseCase = new RecordAndProcessEntryUseCase(
        mockRecorder,
        mockAi,
        mockRepo,
        enqueueUseCase,
        processQueueUseCase,
      );

      uploader.shouldFail = true;

      // Wywołanie stopRecordingAndProcess rzuci błąd z AI
      await expect(recordUseCase.stopRecordingAndProcess()).rejects.toThrow('AI Service 503 Unavailable');

      // Mimo błędu przetwarzania AI, nagranie JEST BEZPIECZNIE ZAPISANE w lokalnej kolejce!
      const items = await queue.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('fixed-uuid-123');
      expect(await fileStorage.fileExists(items[0].path)).toBe(true);
    });
  });
});
