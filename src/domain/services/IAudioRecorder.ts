export interface IAudioRecorder {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string | null>; // Returns URI of the audio file
}
