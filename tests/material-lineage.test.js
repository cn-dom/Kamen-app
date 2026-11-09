import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaterialLineage, getMaterialOriginId } from '../src/lib/materialLineage.js';
import { createMaterialConsumptionRecord } from '../src/lib/materialConsumption.js';

test('prati lanac ploča → ostatak → novi komad bez gubitka izvornog ID-a', () => {
  const slab = { id: 'MAT-SLAB', name: 'Impala ploča', form: 'Ploča' };
  const remnant = { id: 'MAT-REM', name: 'Impala ostatak', form: 'Ostatak', parentMaterialId: slab.id, originMaterialId: slab.id };
  const piece = { id: 'MAT-PIECE', name: 'Klupica', form: 'Komad', parentMaterialId: remnant.id, originMaterialId: slab.id };
  const chain = getMaterialLineage(piece, [slab, remnant, piece]);
  assert.deepEqual(chain.map(row => row.id), ['MAT-SLAB', 'MAT-REM', 'MAT-PIECE']);
  assert.equal(getMaterialOriginId(piece), 'MAT-SLAB');
});

test('zaštita od kružne ili nedostajuće veze u lancu materijala', () => {
  const a = { id: 'A', name: 'A', parentMaterialId: 'B' };
  const b = { id: 'B', name: 'B', parentMaterialId: 'A' };
  assert.deepEqual(getMaterialLineage(a, [a, b]).map(row => row.id), ['B', 'A']);
  assert.deepEqual(getMaterialLineage({ id: 'C', parentMaterialId: 'missing' }, []).map(row => row.id), ['C']);
});

test('obračun potrošnje čuva izvor i roditeljsku stavku izlaznog komada', () => {
  const record = createMaterialConsumptionRecord({
    id: 'CUT-1', orderId: 'RN-1', materialId: 'MAT-REM', materialName: 'Ostatak',
    usedQuantity: 1, boardLengthCm: 100, boardWidthCm: 100, pricePerM2: 20,
    outputs: [{ id: 'OUT-1', name: 'Klupica', form: 'Komad', quantity: 1, length: 50, width: 50, parentMaterialId: 'MAT-REM', originMaterialId: 'MAT-SLAB', sourceCutOperationId: 'CUT-1', orderId: 'RN-1' }]
  });
  assert.equal(record.outputs[0].parentMaterialId, 'MAT-REM');
  assert.equal(record.outputs[0].originMaterialId, 'MAT-SLAB');
  assert.equal(record.outputs[0].sourceCutOperationId, 'CUT-1');
  assert.equal(record.outputs[0].orderId, 'RN-1');
});
