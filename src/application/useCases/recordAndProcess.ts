import { IAudioRecorder } from '../../domain/services/IAudioRecorder';
import { IAiService } from '../../domain/services/IAiService';
import { IDiaryRepository } from '../../domain/repositories/IDiaryRepository';
import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { EnqueueRecordingUseCase } from './recording/enqueueRecordingUseCase';
import { ProcessRecordingQueueUseCase } from './recording/processRecordingQueueUseCase';

export class RecordAndProcessEntryUseCase {
  constructor(
    private audioRecorder: IAudioRecorder,
    private aiService: IAiService,
    private diaryRepository: IDiaryRepository,
    private enqueueRecordingUseCase?: EnqueueRecordingUseCase,
    private processQueueUseCase?: ProcessRecordingQueueUseCase,
  ) {}

  async startRecording(): Promise<void> {
    await this.audioRecorder.startRecording();
  }

  getCurrentMetering(): number {
    return this.audioRecorder.getCurrentMetering();
  }

  getRecordingDuration(): number {
    return this.audioRecorder.getRecordingDuration();
  }

  async stopRecordingAndProcess(
    lifeGoals: string[] = [],
    aiPersonality: string = 'Po prostu przyjaciel',
  ): Promise<DiaryEntry | null> {
    const audioUri = await this.audioRecorder.stopRecording();
    if (!audioUri) {
      throw new Error('No audio recorded');
    }
    const durationMs = this.audioRecorder.getRecordingDuration();

    let audioPathToProcess = audioUri;

    // 1. Zabezpieczenie: nagranie trafia do lokalnej kolejki SQLite zanim cokolwiek zostanie wysłane/przetworzone
    if (this.enqueueRecordingUseCase) {
      const queued = await this.enqueueRecordingUseCase.execute({
        tempUri: audioUri,
        durationMs,
        source: 'phone',
      });
      audioPathToProcess = queued.path;
    }

    // 2. Uruchomienie wysyłki kolejki w tle (jeśli dostępny procesor kolejki)
    if (this.processQueueUseCase) {
      this.processQueueUseCase.processPending().catch(() => {});
    }

    // 3. Transcribe audio
    const newTranscript = await this.aiService.transcribe(audioPathToProcess);
    if (!newTranscript) {
      throw new Error('Transcription resulted in empty text');
    }

    // 2. Append Mode: Check if there's already an entry for today
    const today = new Date();
    const existingEntry = await this.diaryRepository.findByDate(today);

    let finalTranscript = newTranscript;

    if (existingEntry) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const separator = `\n\n--- Kolejne nagranie dodane o ${timeString} ---\n\n`;
      finalTranscript = existingEntry.fullText + separator + newTranscript;
    }

    // 3. Extract structured data via LLM
    const analysis = await this.aiService.extractData(finalTranscript, lifeGoals, aiPersonality);

    // 4. Save or Update to database
    if (existingEntry) {
      const updatedEntry = await this.diaryRepository.update(existingEntry.id, {
        date: existingEntry.date,
        fullText: analysis.full_text,
        parsedData: analysis.parsedData,
      });
      return updatedEntry;
    } else {
      const savedEntry = await this.diaryRepository.save({
        date: today,
        fullText: analysis.full_text,
        parsedData: analysis.parsedData,
      });
      return savedEntry;
    }
  }
}
