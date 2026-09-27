import { RetryRecordingUseCase } from '../retryRecordingUseCase';
import { IRecordingRepository } from '../../../../domain/repositories/IRecordingRepository';

describe('RetryRecordingUseCase', () => {
  it('calls retryRecording on repository with given id', async () => {
    const mockRepo: IRecordingRepository = {
      getRecordings: jest.fn().mockResolvedValue([]),
      retryRecording: jest.fn().mockResolvedValue(undefined),
      subscribeToRecordings: jest.fn().mockReturnValue(() => {}),
    };

    const useCase = new RetryRecordingUseCase(mockRepo);
    await useCase.execute('rec-failed-123');

    expect(mockRepo.retryRecording).toHaveBeenCalledWith('rec-failed-123');
    expect(mockRepo.retryRecording).toHaveBeenCalledTimes(1);
  });
});
