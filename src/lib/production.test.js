import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidProductionWorkCenter, PRODUCTION_WORK_CENTERS, workerCanPerformProductionStage } from './production.js';

test('svaka proizvodna faza zahtijeva odgovarajući radni centar', () => {
  for (const [stage, centers] of Object.entries(PRODUCTION_WORK_CENTERS)) {
    assert.equal(isValidProductionWorkCenter(stage, ''), false);
    for (const center of centers) assert.equal(isValidProductionWorkCenter(stage, center), true);
  }
  assert.equal(isValidProductionWorkCenter('Poliranje', 'Ručna obrada'), false);
  assert.equal(isValidProductionWorkCenter('Kanterica / obrada rubova', 'Vanjska polirka za ravne spomenike i obloge'), false);
  assert.equal(isValidProductionWorkCenter('nepoznata faza', ''), true);
});

test('postojeće vještine ručne obrade i montaže ostaju kompatibilne', () => {
  assert.equal(workerCanPerformProductionStage('Ručna obrada', ['Ostala obrada']), true);
  assert.equal(workerCanPerformProductionStage('Terenski rad / montaža', ['Montaža']), true);
  assert.equal(workerCanPerformProductionStage('Poliranje', ['Montaža']), false);
  assert.equal(workerCanPerformProductionStage('Poliranje', []), true);
});
