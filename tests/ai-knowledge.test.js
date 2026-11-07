import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKamenAiPrompt, KAMEN_AI_DOMAIN_PROMPT } from '../src/lib/aiKnowledge.js';

test('Kamen AI prompt tumači Impalu kao granit u kontekstu vertikala', () => {
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /Impala \/ Impale/);
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /ne metalne klinove/);
  const prompt = buildKamenAiPrompt('treba mi impale za vertikale');
  assert.match(prompt, /granit Impala/);
  assert.match(prompt, /KONTEKST SKLADIŠTA NIJE UKLJUČEN/);
});

test('operativni kontekst se uključuje samo kada je izričito predan', () => {
  const prompt = buildKamenAiPrompt('Koliko imam Impale?', { skladište: [{ materijal: 'Impala' }] });
  assert.match(prompt, /OGRANIČENI OPERATIVNI PODACI/);
  assert.match(prompt, /"materijal":"Impala"/);
});

test('Kamen AI dobiva prethodne poruke i mora zadržati već unesene mjere', () => {
  const prompt = buildKamenAiPrompt('jedan komad od 250 cm', null, [
    { role: 'user', content: 'Ima li Impale za vertikale?' },
    { role: 'assistant', content: 'Treba mi granit Impala za vertikale.' },
    { role: 'user', content: '250 dužina, širina 38, debljina 3 cm' }
  ]);
  assert.match(prompt, /Ima li Impale za vertikale/);
  assert.match(prompt, /250 dužina, širina 38, debljina 3 cm/);
  assert.match(prompt, /Ne pitaj ponovno/);
  assert.match(prompt, /izračunaj površinu/);
});


test('Kamen AI ne traži potvrdu dimenzija koje su već izričito navedene', () => {
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /NE TRAŽI POTVRDU JASNIH PODATAKA/);
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /Ne pitaj je li debljina 3 cm/);
});

test('Kamen AI ne ponavlja pitanje nakon kratke potvrde i izbjegava nepotrebna pitanja o obradi', () => {
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /TUMAČI KRATKE POTVRDE PREMA PRETHODNOM KONTEKSTU/);
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /nemoj ponoviti isto pitanje/);
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /NE OTVARAJ NEPOTREBNE TEME/);
  assert.match(KAMEN_AI_DOMAIN_PROMPT, /osnovnu\/pilanu mjeru bez dodatne obrade/);
});

test('Kamen AI pravila pokrivaju stvarni primjer Impala vertikala', () => {
  const history = [
    { role: 'user', content: 'treba mi 2 komada vertikale 250 x 38 x 3 cm od impale' },
    { role: 'assistant', content: 'Trebaš 2 kom vertikala od granita Impala, 250 × 38 × 3 cm.' },
    { role: 'user', content: 'da' },
    { role: 'assistant', content: 'Trebaju ravne pilane ivice ili standardno bez dodatne obrade?' },
    { role: 'user', content: 'tako je' }
  ];
  const prompt = buildKamenAiPrompt('tako je', null, history);
  assert.match(prompt, /2 komada vertikale 250 x 38 x 3 cm od impale/);
  assert.match(prompt, /TUMAČI KRATKE POTVRDE/);
  assert.match(prompt, /ne pitaj je li debljina 3 cm/i);
});
