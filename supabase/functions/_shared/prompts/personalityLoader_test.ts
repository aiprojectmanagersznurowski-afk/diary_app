/* eslint-disable import/no-unresolved */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { loadPersonalityPrompt, normalizePersonalityKey } from './personalityLoader.ts';

Deno.test('normalizePersonalityKey - aliases map to canonical keys', () => {
  assertEquals(normalizePersonalityKey('Po prostu przyjaciel'), 'friend');
  assertEquals(normalizePersonalityKey('Stefan Banach'), 'banach');
  assertEquals(normalizePersonalityKey('Józef Piłsudski'), 'pilsudski');
  assertEquals(normalizePersonalityKey('David Deida'), 'deida');
  assertEquals(normalizePersonalityKey('Obecność i Męskość'), 'deida');
  assertEquals(normalizePersonalityKey('Andrew Huberman'), 'huberman');
  assertEquals(normalizePersonalityKey('Biologia i Rytm Dnia'), 'huberman');
});

Deno.test('loadPersonalityPrompt - deida perspective contains core purpose and 3rd person stance', async () => {
  const prompt = await loadPersonalityPrompt('deida');
  assertStringIncludes(prompt, 'David Deid');
  assertStringIncludes(prompt, '3. osobie');
  assertStringIncludes(prompt, 'obecnoś');
});

Deno.test(
  'loadPersonalityPrompt - huberman perspective contains circadian, dopamine and medical disclaimer',
  async () => {
    const prompt = await loadPersonalityPrompt('huberman');
    assertStringIncludes(prompt, 'Huberman');
    assertStringIncludes(prompt, '3. osobie');
    assertStringIncludes(prompt, 'NIE dawkujesz');
    assertStringIncludes(prompt, 'lekarz');
  },
);
