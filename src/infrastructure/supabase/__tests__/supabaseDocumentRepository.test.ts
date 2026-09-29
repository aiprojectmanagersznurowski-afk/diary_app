import { mapRowToDailyDocument } from '../supabaseDocumentRepository';

describe('mapRowToDailyDocument', () => {
  it('maps a full row to a DailyDocument', () => {
    const row = {
      id: 'doc-1',
      user_id: 'user-1',
      day: '2026-09-23',
      body_md: '# Test',
      md_path: 'user-1/daily/2026-09-23.md',
      tags: ['projekt-x'],
      created_at: '2026-09-23T10:00:00Z',
      data: {
        dominantThought: 'Skupiłem się na jednym zadaniu.',
        summary: 'Produktywny dzień.',
        quotes: ['Cytat'],
        impactOnGoals: 'Bliżej celu.',
        goalImpactType: 'positive',
        completedTasks: ['Zadanie 1'],
        importantEvents: ['Wydarzenie'],
        emotions: ['Satysfakcja'],
        emotionTriggers: [{ emotion: 'Satysfakcja', trigger: 'Ukończony projekt' }],
        fatigueLevel: 4,
        stressVsCalm: 'calm',
        gratefulFor: 'Za dobry dzień.',
        goalAdvice: 'Odpocznij.',
        ideas: [{ documentId: 'note-1', title: 'Pomysł', oneLiner: 'Krótki opis.' }],
      },
    };

    const doc = mapRowToDailyDocument(row);

    expect(doc.id).toBe('doc-1');
    expect(doc.userId).toBe('user-1');
    expect(doc.kind).toBe('daily');
    expect(doc.day).toBe('2026-09-23');
    expect(doc.tags).toEqual(['projekt-x']);
    expect(doc.dominantThought).toBe('Skupiłem się na jednym zadaniu.');
    expect(doc.goalImpactType).toBe('positive');
    expect(doc.ideas).toEqual([{ documentId: 'note-1', title: 'Pomysł', oneLiner: 'Krótki opis.' }]);
  });

  it('applies safe defaults when data fields are missing', () => {
    const row = {
      id: 'doc-2',
      user_id: 'user-1',
      day: '2026-09-24',
      body_md: null,
      md_path: null,
      tags: null,
      created_at: null,
      data: {},
    };

    const doc = mapRowToDailyDocument(row);

    expect(doc.bodyMd).toBe('');
    expect(doc.tags).toEqual([]);
    expect(doc.quotes).toEqual([]);
    expect(doc.completedTasks).toEqual([]);
    expect(doc.emotionTriggers).toEqual([]);
    expect(doc.ideas).toEqual([]);
    expect(doc.fatigueLevel).toBe(0);
    expect(doc.goalImpactType).toBe('neutral');
    expect(doc.goalAdvice).toBeNull();
    expect(doc.createdAt).toEqual(expect.any(String));
  });
});
