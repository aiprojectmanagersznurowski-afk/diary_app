import { GraphNode, getNodeColor, getNodeSize } from '../../../../domain/models/Graph';

describe('Graph Node Visual Helpers', () => {
  describe('getNodeSize', () => {
    it('returns larger size for daily entry nodes (central hubs)', () => {
      const dailyNode: GraphNode = {
        id: 'daily-1',
        kind: 'daily',
        day: '2026-09-23',
        title: '2026-09-23',
        slug: '2026-09-23',
        tags: [],
        createdAt: '2026-09-23T00:00:00Z',
      };
      const noteNode: GraphNode = {
        id: 'note-1',
        kind: 'note',
        day: '2026-09-23',
        title: 'Notatka',
        slug: 'notatka',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      };

      expect(getNodeSize(dailyNode)).toBeGreaterThan(getNodeSize(noteNode));
      expect(getNodeSize(dailyNode)).toBe(12);
      expect(getNodeSize(noteNode)).toBe(5);
    });
  });

  describe('getNodeColor', () => {
    it('returns central hub color for daily nodes', () => {
      const dailyNode: GraphNode = {
        id: 'daily-1',
        kind: 'daily',
        day: '2026-09-23',
        title: '2026-09-23',
        slug: '2026-09-23',
        tags: [],
        createdAt: '2026-09-23T00:00:00Z',
      };
      expect(getNodeColor(dailyNode)).toBe('#38BDF8');
    });

    it('returns node.categoryColor if present', () => {
      const noteNode: GraphNode = {
        id: 'note-1',
        kind: 'note',
        day: '2026-09-23',
        title: 'Notatka',
        slug: 'notatka',
        categoryColor: '#E11D48',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      };
      expect(getNodeColor(noteNode)).toBe('#E11D48');
    });

    it('returns color from categoryColorMap if matching categoryId', () => {
      const noteNode: GraphNode = {
        id: 'note-1',
        kind: 'note',
        day: '2026-09-23',
        title: 'Notatka',
        slug: 'notatka',
        categoryId: 'cat-work',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      };
      const map = { 'cat-work': '#10B981' };
      expect(getNodeColor(noteNode, map)).toBe('#10B981');
    });

    it('returns note type color if no category color is available', () => {
      const ideaNode: GraphNode = {
        id: 'note-1',
        kind: 'note',
        noteType: 'idea',
        day: '2026-09-23',
        title: 'Pomysł',
        slug: 'pomysl',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      };
      expect(getNodeColor(ideaNode)).toBe('#FBBF24');
    });

    it('falls back to default color if neither category nor noteType is set', () => {
      const plainNode: GraphNode = {
        id: 'note-1',
        kind: 'note',
        day: '2026-09-23',
        title: 'Bez typu',
        slug: 'bez-typu',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      };
      expect(getNodeColor(plainNode)).toBe('#94A3B8');
    });
  });
});
