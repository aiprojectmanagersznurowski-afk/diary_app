import { IRecordingRepository } from '../../../domain/repositories/IRecordingRepository';

export class RetryRecordingUseCase {
  constructor(private recordingRepository: IRecordingRepository) {}

  async execute(id: string): Promise<void> {
    await this.recordingRepository.retryRecording(id);
  }
}
