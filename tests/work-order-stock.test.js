import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderReservations, getReservedQuantity, releaseOrderReservations, settleReservationForCut } from '../src/lib/workOrderStock.js';

test('normalizira nove i stare formate rezervacija te zbraja duplikate materijala', () => {
  const order = { reservedMaterials: [
    { materialId: 'MAT-1', material: 'Impala', quantity: 0.25 },
    { materialId: 'MAT-1', material: 'Impala', quantity: 0.5 },
    { materialId: 'MAT-2', quantity: 1 },
    { materialId: '', quantity: 9 },
    { materialId: 'MAT-3', quantity: -1 }
  ] };
  assert.deepEqual(getOrderReservations(order), [
    { materialId: 'MAT-1', material: 'Impala', quantity: 0.75 },
    { materialId: 'MAT-2', material: '', quantity: 1 }
  ]);
  assert.equal(getReservedQuantity(order, 'MAT-1'), 0.75);
  assert.deepEqual(getOrderReservations({ reservedMaterialId: 'MAT-9', reservedMaterialQty: 0.4 }), [
    { materialId: 'MAT-9', material: '', quantity: 0.4 }
  ]);
});

test('pilanje vraća neiskorištenu rezervaciju i skida samo stvarnu potrošnju', () => {
  const result = settleReservationForCut({
    order: { reservedMaterials: [{ materialId: 'MAT-1', quantity: 0.75 }] },
    materialId: 'MAT-1',
    usedQuantity: 0.4,
    stockQuantity: 2.25
  });
  assert.equal(result.stockAfter, 2.6);
  assert.equal(result.stockDelta, 0.35);
  assert.equal(result.consumedQuantity, 0.4);
  assert.equal(result.returnedQuantity, 0.75);
  assert.deepEqual(result.remainingReservations, []);
});

test('pilanje bez rezervacije umanjuje zalihu za stvarno utrošenu količinu', () => {
  const result = settleReservationForCut({
    order: { reservedMaterials: [] },
    materialId: 'MAT-1',
    usedQuantity: 0.25,
    stockQuantity: 1
  });
  assert.equal(result.stockAfter, 0.75);
  assert.equal(result.returnedQuantity, 0);
});

test('ne dopušta potrošnju veću od raspoložive i rezervirane količine', () => {
  const result = settleReservationForCut({
    order: { reservedMaterialId: 'MAT-1', reservedMaterialQty: 0.5 },
    materialId: 'MAT-1',
    usedQuantity: 2,
    stockQuantity: 1
  });
  assert.match(result.error, /dovoljno/i);
});

test('otkazivanje vraća sve rezervacije grupirano po materijalu', () => {
  const result = releaseOrderReservations({
    order: { reservedMaterials: [
      { materialId: 'MAT-1', quantity: 0.25 },
      { materialId: 'MAT-1', quantity: 0.5 },
      { materialId: 'MAT-2', quantity: 1 }
    ] },
    materials: [
      { id: 'MAT-1', quantity: 2 },
      { id: 'MAT-2', quantity: 0.5 },
      { id: 'MAT-3', quantity: 7 }
    ]
  });
  assert.deepEqual(result.materials.map(item => item.quantity), [2.75, 1.5, 7]);
  assert.equal(result.returned.length, 2);
});

test('ne mijenja skladište ako nedostaje materijal rezervacije', () => {
  const materials = [{ id: 'MAT-1', quantity: 2 }];
  const result = releaseOrderReservations({
    order: { reservedMaterials: [{ materialId: 'MAT-MISSING', quantity: 1 }] },
    materials
  });
  assert.match(result.error, /nije pronađen/i);
  assert.equal(materials[0].quantity, 2);
});
