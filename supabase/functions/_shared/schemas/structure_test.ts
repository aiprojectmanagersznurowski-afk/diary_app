/* eslint-disable import/no-unresolved */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { normalizeCategory, structuredNoteSchema, DILEMMA_CATEGORY } from './structure.ts';

Deno.test('normalizeCategory - poprawnie rozpoznaje warianty dylematów i synonimów', () => {
  assertEquals(normalizeCategory('dylemat'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('Dylemat'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('dylematy'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('DYLEMATY'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('decyzja'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('decyzje'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('Decyzja do podjęcia'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('wybór'), DILEMMA_CATEGORY);
  assertEquals(normalizeCategory('dilemma'), DILEMMA_CATEGORY);
});

Deno.test('normalizeCategory - poprawnie mapuje pozostałe kategorie i diakrytyki', () => {
  assertEquals(normalizeCategory('praca'), 'Praca');
  assertEquals(normalizeCategory('kariera'), 'Praca');
  assertEquals(normalizeCategory('zdrowie'), 'Zdrowie');
  assertEquals(normalizeCategory('relacje'), 'Relacje');
  assertEquals(normalizeCategory('finanse'), 'Finanse');
  assertEquals(normalizeCategory('pieniądze'), 'Finanse');
  assertEquals(normalizeCategory('nauka'), 'Nauka');
  assertEquals(normalizeCategory('rozwój'), 'Nauka');
});

Deno.test('structuredNoteSchema - parsuje i normalizuje dylemat z różnymi polami wejściowymi', () => {
  const result = structuredNoteSchema.safeParse({
    title: 'Czy zatrudnić programistę seniora czy juniora?',
    noteType: 'dylemat', // alias do reflection
    category: 'dylematy',
    tags: ['rekrutacja', 'zespół'],
    summary: 'Wybór między doświadczeniem a kosztem.',
    body: 'Mam budżet na jednego seniora albo dwóch juniorów.',
  });

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.noteType, 'reflection');
    assertEquals(result.data.category, 'Dylematy');
  }
});
