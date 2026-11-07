import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKamenAiPrompt, KAMEN_AI_DOMAIN_PROMPT } from '../src/lib/aiKnowledge.js';

test('Kamen AI prompt tumači Impalu kao granit u kontekstu vertikala', () => {
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /Impala \/ Impale/);
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /ne kao metalne klinove/);
  const prompt = buildKamenAiPrompt('treba mi impale za vertikale');
  assert.match(prompt, /granit Impala/);
  assert.match(prompt, /KONTEKST SKLADIŠTA NIJE UKLJUČEN/);
});

test('operativni kontekst se uključuje samo kada je izričito predan', () => {
  const prompt = buildKamenAiPrompt('Koliko imam Impale?', { skladište: [{ materijal: 'Impala' }] });
  assert.match(prompt, /OGRANIČENI OPERATIVNI PODACI/);
  assert.match(prompt, /"materijal":"Impala"/);
});
