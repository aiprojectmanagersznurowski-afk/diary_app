import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { IAudioRecorder } from '../../domain/services/IAudioRecorder';

export class ExpoAvAudioRecorder implements IAudioRecorder {
  private recording: any | null = null;

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
      const commonOptions = {
        extension: baseOptions.extension,
        sampleRate: baseOptions.sampleRate,
        numberOfChannels: baseOptions.numberOfChannels,
        bitRate: baseOptions.bitRate,
        isMeteringEnabled: baseOptions.isMeteringEnabled ?? false,
      };
      const platformOptions = Platform.OS === 'ios' ? baseOptions.ios : baseOptions.android;
      const options = {
        ...commonOptions,
        ...platformOptions,
      };

      this.recording = new AudioModule.AudioRecorder(options);
      await this.recording.prepareToRecordAsync();
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
}
