import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync, AudioRecorder } from 'expo-audio';
import type { RecordingOptions } from 'expo-audio';
import { IAudioRecorder } from '../../domain/services/IAudioRecorder';

/**
 * Custom recording preset optimised for speech / voice diary.
 *
 * Key choices:
 * - **Mono (1 channel)** — phone mic is mono; stereo doubles file size for no gain.
 * - **16 kHz sample rate** — matches Whisper's native rate, avoids server-side
 *   resampling while perfectly capturing the human speech band (≤8 kHz).
 * - **32 kbps AAC** — transparent quality for speech at ~14 MB/hour
 *   (vs ~58 MB/hour with HIGH_QUALITY stereo 128 kbps).
 * - **AAC (.m4a)** — universally supported, streamable, good encoder on both platforms.
 */
const SPEECH_MONO: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: 'aac ', // IOSOutputFormat.MPEG4AAC
    audioQuality: 0x40, // AudioQuality.MEDIUM — good enough for speech
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
};

export class ExpoAvAudioRecorder implements IAudioRecorder {
  private recording: AudioRecorder | null = null;
  private statusSubscription: any = null;

  async startRecording(): Promise<void> {
    try {
      const permissionResponse = await requestRecordingPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        throw new Error('Brak uprawnień do mikrofonu! Użytkownik odmówił dostępu.');
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const options = {
        ...SPEECH_MONO,
        isMeteringEnabled: true,
      };

      // AudioModule.AudioRecorder is the documented non-hook constructor (see expo-audio's
      // useAudioRecorder); the barrel's type-only re-export of AudioModule.types trips the
      // static namespace check even though this is valid at runtime.
      // eslint-disable-next-line import/namespace
      this.recording = new AudioModule.AudioRecorder(options as any);

      // Some native modules only compute metering when there is at least one listener
      this.statusSubscription = this.recording.addListener('recordingStatusUpdate', () => {});

      await this.recording.prepareToRecordAsync(options);
      this.recording.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      throw new Error('Failed to start recording: ' + String(err));
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      return null;
    }

    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }

    try {
      await this.recording.stop();
      await setAudioModeAsync({
        allowsRecording: false,
      });
      const uri = this.recording.uri;
      this.recording = null;
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  }

  getCurrentMetering(): number {
    if (!this.recording) {
      return -160;
    }
    const status = this.recording.getStatus();
    return status.metering ?? -160;
  }

  getRecordingDuration(): number {
    if (!this.recording) {
      return 0;
    }
    const status = this.recording.getStatus();
    return status.durationMillis ?? 0;
  }
}
