import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_STAGES,
  buildProductionUnits,
  normalizeProductionRecords,
  calculateStageElapsedMs,
  calculatePieceProgress,
  isProductionOrderComplete
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

test('migracija prenosi završenu staru fazu završne kontrole', () => {
  const migrated = normalizeProductionRecords({
    'RN-004': { 'Završna kontrola': 'Završeno', updatedAt: '2026-01-02T12:00:00.000Z' }
  }, [{ id: 'RN-004', pieces: [{ name: 'Spomenik', quantity: 1 }] }]);
  assert.equal(migrated.pieces['RN-004::0::1'].quality.status, 'Prošlo');
  assert.equal(migrated.pieces['RN-004::0::1'].quality.checkedAt, '2026-01-02T12:00:00.000Z');
});

test('svaki komad prikazuje vlastiti odabrani materijal iz višematerijalnog naloga', () => {
  const rows = buildProductionUnits([
    { id: 'RN-005', material: 'Granit, Mramor', materialAllocations: [
      { materialId: 'g1', material: 'Granit' },
      { materialId: 'm1', material: 'Mramor' }
    ], pieces: [
      { name: 'Postolje', materialId: 'g1', quantity: 1 },
      { name: 'Ploča', materialId: 'm1', quantity: 1 }
    ] }
  ], [{ id: 'g1', name: 'Granit iz skladišta' }]);
  assert.equal(rows[0].material, 'Granit iz skladišta');
  assert.equal(rows[1].material, 'Mramor');
});

test('radni nalog se može zatvoriti tek nakon kontrole svakog fizičkog komada', () => {
  const order = { id: 'RN-006', pieces: [{ name: 'Element', quantity: 2 }] };
  const records = { version: 2, pieces: {} };
  const keys = ['RN-006::0::1', 'RN-006::0::2'];
  keys.forEach(key => {
    records.pieces[key] = {
      stages: Object.fromEntries(PRODUCTION_STAGES.map(stage => [stage, { status: 'Završeno' }])),
      quality: { status: 'Prošlo' }
    };
  });
  assert.equal(isProductionOrderComplete(order, records), true);
  records.pieces[keys[1]].quality.status = 'Neispravno';
  assert.equal(isProductionOrderComplete(order, records), false);
  records.pieces[keys[1]].quality.status = 'Prošlo';
  records.pieces[keys[0]].stages[PRODUCTION_STAGES[2]].status = 'U tijeku';
  assert.equal(isProductionOrderComplete(order, records), false);
  assert.equal(isProductionOrderComplete({ id: 'RN-007', pieces: [] }, records), false);
});
