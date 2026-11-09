import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidProductionWorkCenter } from './production.js';

test('poliranje zahtijeva jednu od dvije odgovarajuće polirke', () => {
  assert.equal(isValidProductionWorkCenter('Poliranje', 'Polirka za šmuse i okapnice'), true);
  assert.equal(isValidProductionWorkCenter('Poliranje', 'Vanjska polirka za ravne spomenike i obloge'), true);
  assert.equal(isValidProductionWorkCenter('Poliranje', ''), false);
  assert.equal(isValidProductionWorkCenter('Poliranje', 'Ručna obrada'), false);
});

test('ostala obrada zahtijeva ručnu obradu ili terenski rad', () => {
  assert.equal(isValidProductionWorkCenter('Ostala obrada', 'Ručna obrada'), true);
  assert.equal(isValidProductionWorkCenter('Ostala obrada', 'Terenski rad / montaža grobnica'), true);
  assert.equal(isValidProductionWorkCenter('Ostala obrada', ''), false);
  assert.equal(isValidProductionWorkCenter('Ostala obrada', 'Vanjska polirka za ravne spomenike i obloge'), false);
});

test('faze bez posebnog radnog centra ne traže odabir', () => {
  assert.equal(isValidProductionWorkCenter('Pilanje', ''), true);
  assert.equal(isValidProductionWorkCenter('Kanterica / obrada rubova', ''), true);
});
