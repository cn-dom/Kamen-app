import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_STAGES,
  buildProductionUnits,
  normalizeProductionRecords,
  calculateStageElapsedMs,
  calculatePieceProgress
} from '../src/lib/production.js';

test('proizvodnja stvara zaseban zapis za svaki fizički komad', () => {
  const rows = buildProductionUnits([
    { id: 'RN-001', pieces: [
      { name: 'Klupica', quantity: 2, length: 120, width: 30 },
      { name: 'Ploča', quantity: 1, length: 80, width: 40 }
    ] }
  ]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.key), ['RN-001::0::1', 'RN-001::0::2', 'RN-001::1::1']);
  assert.equal(rows[1].label, 'Klupica');
  assert.equal(rows[2].label, 'Ploča');
});

test('migracija čuva stare statuse i stvara neovisne komade', () => {
  const migrated = normalizeProductionRecords({
    'RN-002': { Pilanje: 'Završeno', Poliranje: 'U tijeku', updatedAt: '2026-01-01T08:00:00.000Z' }
  }, [{ id: 'RN-002', pieces: [{ name: 'Element', quantity: 2 }] }]);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.pieces['RN-002::0::1'].stages.Pilanje.status, 'Završeno');
  assert.equal(migrated.pieces['RN-002::0::2'].stages.Pilanje.status, 'Završeno');
  assert.equal(migrated.pieces['RN-002::0::1'].stages.Poliranje.status, 'U tijeku');
  assert.notEqual(migrated.pieces['RN-002::0::1'], migrated.pieces['RN-002::0::2']);
  assert.deepEqual(migrated.legacyRecordsPreserved['RN-002'], { Pilanje: 'Završeno', Poliranje: 'U tijeku', updatedAt: '2026-01-01T08:00:00.000Z' });
});

test('migracija ne izmišlja komade za naloge bez stavki', () => {
  const migrated = normalizeProductionRecords({}, [{ id: 'RN-003' }]);
  assert.deepEqual(Object.keys(migrated.pieces), []);
});

test('vrijeme rada zbraja završene i trenutačno otvorene intervale', () => {
  const stage = { sessions: [
    { startedAt: '2026-01-01T08:00:00.000Z', endedAt: '2026-01-01T09:30:00.000Z' },
    { startedAt: '2026-01-01T10:00:00.000Z', endedAt: null }
  ] };
  const now = new Date('2026-01-01T10:45:00.000Z').getTime();
  assert.equal(calculateStageElapsedMs(stage, now), 135 * 60 * 1000);
});

test('napredak komada broji završene i nepotrebne faze, ali ne aktivne', () => {
  const record = { stages: {
    [PRODUCTION_STAGES[0]]: { status: 'Završeno' },
    [PRODUCTION_STAGES[1]]: { status: 'Nije potrebno' },
    [PRODUCTION_STAGES[2]]: { status: 'U tijeku' },
    [PRODUCTION_STAGES[3]]: { status: 'Nije započeto' }
  } };
  assert.equal(calculatePieceProgress(record), 50);
});
