import { IngestWatchInboxUseCase } from '../ingestWatchInboxUseCase';
import { EnqueueRecordingUseCase } from '../enqueueRecordingUseCase';
import { IWatchConnectivity, WatchInboxFile } from '../../../../domain/services/IWatchConnectivity';
import { IRecordingQueue } from '../../../../domain/services/IRecordingQueue';
import { IFileStorage } from '../../../../domain/services/IFileStorage';
import { QueuedRecording } from '../../../../domain/models/QueuedRecording';

function makeInboxFile(overrides: Partial<WatchInboxFile> = {}): WatchInboxFile {
  return {
    id: 'watch-rec-1',
    recordedAt: '2026-09-30T09:00:00Z',
    durationMs: 12000,
    path: 'file:///watch-inbox/watch-rec-1.m4a',
    ...overrides,
  };
}

function makeQueuedRecording(file: WatchInboxFile): QueuedRecording {
  return {
    id: file.id,
    path: `permanent/${file.id}.m4a`,
    recordedAt: file.recordedAt,
    durationMs: file.durationMs,
    source: 'watch',
    status: 'pending',
    attempts: 0,
    nextAttemptAt: null,
  };
}

describe('IngestWatchInboxUseCase', () => {
  let mockWatchConnectivity: jest.Mocked<IWatchConnectivity>;
  let mockRecordingQueue: jest.Mocked<IRecordingQueue>;
  let mockFileStorage: jest.Mocked<IFileStorage>;
  let enqueueUseCase: EnqueueRecordingUseCase;
  let useCase: IngestWatchInboxUseCase;

  beforeEach(() => {
    mockWatchConnectivity = {
      getInboxFiles: jest.fn().mockResolvedValue([]),
      clearInboxFile: jest.fn().mockResolvedValue(undefined),
      subscribeToInboxFiles: jest.fn().mockReturnValue(() => {}),
      sendRecordingStatus: jest.fn().mockResolvedValue(undefined),
    };

    mockRecordingQueue = {
      enqueue: jest.fn(),
      getPending: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue(null),
      getAll: jest.fn().mockResolvedValue([]),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markSuccess: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockFileStorage = {
      moveToPermanent: jest.fn().mockImplementation(async (_tempUri: string, id: string) => `permanent/${id}.m4a`),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
    };

    enqueueUseCase = new EnqueueRecordingUseCase(mockRecordingQueue, mockFileStorage, () => 'unused-generated-id');
    useCase = new IngestWatchInboxUseCase(mockWatchConnectivity, mockRecordingQueue, enqueueUseCase);
  });

  it('enqueues an inbox file into the shared recording queue with source=watch and the watch id', async () => {
    const file = makeInboxFile();
    mockWatchConnectivity.getInboxFiles.mockResolvedValueOnce([file]);
    mockRecordingQueue.enqueue.mockResolvedValueOnce(makeQueuedRecording(file));

    await useCase.execute();

    expect(mockRecordingQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: file.id, source: 'watch', durationMs: file.durationMs }),
    );
    expect(mockFileStorage.moveToPermanent).toHaveBeenCalledWith(file.path, file.id);
    expect(mockWatchConnectivity.clearInboxFile).toHaveBeenCalledWith(file.id);
  });

  it('does not call enqueue again when the file is already in the queue (idempotent, no duplicate)', async () => {
    const file = makeInboxFile();
    mockWatchConnectivity.getInboxFiles.mockResolvedValueOnce([file]);
    mockRecordingQueue.getById.mockResolvedValueOnce(makeQueuedRecording(file));

    await useCase.execute();

    expect(mockRecordingQueue.enqueue).not.toHaveBeenCalled();
    expect(mockWatchConnectivity.clearInboxFile).toHaveBeenCalledWith(file.id);
  });

  it('does not throw and still clears the inbox file when enqueue rejects with a duplicate-id error', async () => {
    const file = makeInboxFile();
    mockWatchConnectivity.getInboxFiles.mockResolvedValueOnce([file]);
    mockRecordingQueue.getById.mockResolvedValueOnce(null);
    mockRecordingQueue.enqueue.mockRejectedValueOnce(new Error('UNIQUE constraint failed: queued_recordings.id'));

    await expect(useCase.execute()).resolves.toBeUndefined();

    expect(mockWatchConnectivity.clearInboxFile).toHaveBeenCalledWith(file.id);
  });

  it('calling execute twice in a row for the same still-pending file does not create a duplicate', async () => {
    const file = makeInboxFile();
    mockWatchConnectivity.getInboxFiles.mockResolvedValue([file]);
    mockRecordingQueue.enqueue.mockResolvedValueOnce(makeQueuedRecording(file));

    await useCase.execute();
    expect(mockRecordingQueue.enqueue).toHaveBeenCalledTimes(1);

    // Simulate the recording now being present in the queue for the second pass, as it would be
    // in a real SqliteRecordingQueue after the first successful enqueue.
    mockRecordingQueue.getById.mockResolvedValueOnce(makeQueuedRecording(file));
    await useCase.execute();

    expect(mockRecordingQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('processes multiple inbox files in one pass', async () => {
    const fileA = makeInboxFile({ id: 'a' });
    const fileB = makeInboxFile({ id: 'b' });
    mockWatchConnectivity.getInboxFiles.mockResolvedValueOnce([fileA, fileB]);
    mockRecordingQueue.enqueue.mockResolvedValueOnce(makeQueuedRecording(fileA));
    mockRecordingQueue.enqueue.mockResolvedValueOnce(makeQueuedRecording(fileB));

    await useCase.execute();

    expect(mockRecordingQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(mockWatchConnectivity.clearInboxFile).toHaveBeenCalledTimes(2);
  });
});
