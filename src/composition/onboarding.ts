import { ExpoAvAudioRecorder } from '../infrastructure/audio/expoAudioRecorder';
import { GroqAiService } from '../infrastructure/ai/groqService';
import { IAudioRecorder } from '../domain/services/IAudioRecorder';
import { IAiService } from '../domain/services/IAiService';

export const audioRecorder: IAudioRecorder = new ExpoAvAudioRecorder();
export const aiService: IAiService = new GroqAiService();
