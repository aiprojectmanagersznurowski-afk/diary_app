import { RelatedThought, getRelationTypeLabel, getRelationTypeIcon } from '../RelatedThought';

describe('RelatedThought Model', () => {
  it('creates valid RelatedThought object', () => {
    const item: RelatedThought = {
      documentId: 'doc-123',
      title: 'Notatka testowa',
      kind: 'note',
      noteType: 'idea',
      day: '2026-09-23',
      relationType: 'semantic',
      similarity: 0.88,
      reason: 'Wspólny temat grafów wiedzy',
    };

    expect(item.documentId).toBe('doc-123');
    expect(item.similarity).toBe(0.88);
    expect(item.relationType).toBe('semantic');
  });

  describe('getRelationTypeLabel', () => {
    it('returns appropriate Polish labels for relation types', () => {
      expect(getRelationTypeLabel('semantic')).toBe('Podobieństwo tematyczne');
      expect(getRelationTypeLabel('day')).toBe('Ten sam dzień');
      expect(getRelationTypeLabel('wikilink')).toBe('Odnośnik w tekście');
      expect(getRelationTypeLabel('llm')).toBe('Powiązanie AI');
      expect(getRelationTypeLabel('manual')).toBe('Powiązanie ręczne');
    });
  });

  describe('getRelationTypeIcon', () => {
    it('returns appropriate icon names for relation types', () => {
      expect(getRelationTypeIcon('semantic')).toBe('cpu');
      expect(getRelationTypeIcon('day')).toBe('calendar');
      expect(getRelationTypeIcon('wikilink')).toBe('link');
      expect(getRelationTypeIcon('llm')).toBe('zap');
      expect(getRelationTypeIcon('manual')).toBe('edit-3');
    });
  });
});
