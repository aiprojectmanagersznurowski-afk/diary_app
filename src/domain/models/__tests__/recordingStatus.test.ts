import {
  RecordingStatus,
  mapRecordingStatusToUi,
  getRecordingStatusLabel,
  getRecordingStatusBadgeColor,
  isRecordingRetryable,
} from '../Recording';

describe('RecordingStatus mappings', () => {
  it('mapRecordingStatusToUi maps each status to the correct UI category', () => {
    expect(mapRecordingStatusToUi('queued')).toBe('queued');
    expect(mapRecordingStatusToUi('uploaded')).toBe('uploaded');
    expect(mapRecordingStatusToUi('transcribed')).toBe('processing');
    expect(mapRecordingStatusToUi('segmented')).toBe('processing');
    expect(mapRecordingStatusToUi('done')).toBe('done');
    expect(mapRecordingStatusToUi('failed')).toBe('failed');
  });

  it('getRecordingStatusLabel returns human-readable Polish labels', () => {
    expect(getRecordingStatusLabel('queued')).toBe('W kolejce');
    expect(getRecordingStatusLabel('uploaded')).toBe('Wysłane');
    expect(getRecordingStatusLabel('transcribed')).toBe('Transkrypcja...');
    expect(getRecordingStatusLabel('segmented')).toBe('Podział na notatki...');
    expect(getRecordingStatusLabel('done')).toBe('Gotowe');
    expect(getRecordingStatusLabel('failed')).toBe('Błąd');
  });

  it('getRecordingStatusBadgeColor returns distinct hex colors', () => {
    const statuses: RecordingStatus[] = ['queued', 'uploaded', 'transcribed', 'segmented', 'done', 'failed'];
    const colors = statuses.map(getRecordingStatusBadgeColor);

    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('isRecordingRetryable returns true only for failed recordings', () => {
    expect(isRecordingRetryable('failed')).toBe(true);
    expect(isRecordingRetryable('queued')).toBe(false);
    expect(isRecordingRetryable('uploaded')).toBe(false);
    expect(isRecordingRetryable('transcribed')).toBe(false);
    expect(isRecordingRetryable('segmented')).toBe(false);
    expect(isRecordingRetryable('done')).toBe(false);
  });
});
