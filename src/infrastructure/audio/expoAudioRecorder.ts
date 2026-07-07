import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, AudioRecorder } from 'expo-audio';
import { Platform } from 'react-native';
import { IAudioRecorder } from '../../domain/services/IAudioRecorder';

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

      const baseOptions = RecordingPresets.HIGH_QUALITY;
      const options = {
        ...baseOptions,
        isMeteringEnabled: true,
      };

      this.recording = new AudioModule.AudioRecorder(options as any);
      
      // Some native modules only compute metering when there is at least one listener
      this.statusSubscription = this.recording.addListener('RECORDING_STATUS_UPDATE', () => {});

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
