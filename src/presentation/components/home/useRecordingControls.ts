import { useCallback, useEffect, useRef, useState } from 'react';
import { useDiaryStore } from '../../../application/store/useDiaryStore';
import { useNotesStore } from '../../../application/store/useNotesStore';

/** Jak długo po zatrzymaniu nagrania widać pigułkę „Przetwarzam nagranie...”. */
const PROCESSING_PILL_MS = 1000;
/** Opóźnione odświeżenie listy nagrań po zatrzymaniu (Realtime i tak dosyła zmiany statusu). */
const REFRESH_AFTER_STOP_MS = 1500;

/** Wspólna obsługa przycisku nagrywania dla ekranu głównego i ekranu Nagrania. */
export function useRecordingControls() {
  const isRecording = useDiaryStore((s) => s.isRecording);
  const startRecording = useDiaryStore((s) => s.startRecording);
  const stopRecordingAndProcess = useDiaryStore((s) => s.stopRecordingAndProcess);
  const fetchRecordings = useNotesStore((s) => s.fetchRecordings);
  const [showProcessingPill, setShowProcessingPill] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const toggle = useCallback(async () => {
    if (!isRecording) {
      await startRecording();
      return;
    }
    setShowProcessingPill(true);
    timers.current.push(setTimeout(() => setShowProcessingPill(false), PROCESSING_PILL_MS));
    timers.current.push(setTimeout(() => void fetchRecordings(), REFRESH_AFTER_STOP_MS));
    await stopRecordingAndProcess();
    void fetchRecordings();
  }, [isRecording, startRecording, stopRecordingAndProcess, fetchRecordings]);

  return { isRecording, showProcessingPill, toggle };
}
