import { getRecordingProgress, isRecordingInProgress, RecordingStatus } from '../Recording';

describe('postęp nagrania (pasek pod wierszem)', () => {
  it.each<[RecordingStatus, number]>([
    ['queued', 20],
    ['uploaded', 40],
    ['transcribed', 60],
    ['segmented', 80],
    ['done', 100],
    ['failed', 0],
  ])('%s → %i%%', (status, expected) => {
    expect(getRecordingProgress(status)).toBe(expected);
  });

  it('w toku są wszystkie statusy poza done i failed', () => {
    expect(isRecordingInProgress('queued')).toBe(true);
    expect(isRecordingInProgress('uploaded')).toBe(true);
    expect(isRecordingInProgress('transcribed')).toBe(true);
    expect(isRecordingInProgress('segmented')).toBe(true);
    expect(isRecordingInProgress('done')).toBe(false);
    expect(isRecordingInProgress('failed')).toBe(false);
  });
});
