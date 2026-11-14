import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareCutConfirmation } from '../src/lib/cutConfirmation.js';

const order = {
  id: 'RN-2026-001',
  pieces: [{ name: 'Vertikala', materialId: 'slab-1', length: 120, width: 30, quantity: 2 }],
  reservedMaterials: [{ materialId: 'slab-1', quantity: 0.12 }],
  cuttingPlan: { version: 1, materials: [{ stockId: 'slab-1', stockName: 'Impala', sawName: 'Pila 1', summary: { sheetCount: 1, unplaced: [] } }] }
};
const stock = { id: 'slab-1', name: 'Impala', type: 'Granit', form: 'Ploča', length: 302, width: 224, thickness: 3, quantity: 5.88, unit: 'ploča', location: 'A1', pricePerM2: 200 };

test('potvrda pilanja oslobađa rezervaciju, skida stvarnu ploču i stvara ostatak', () => {
  const result = prepareCutConfirmation({ order, materials: [stock], materialId: 'slab-1', operationId: 'CUT-001', actor: 'Radnik', remnants: [{ length: 150, width: 40 }] });
  assert.equal(result.order.reservedMaterials.length, 0);
  assert.equal(result.materials[0].quantity, 5);
  assert.equal(result.createdRemnants.length, 1);
  assert.equal(result.createdRemnants[0].form, 'Ostatak');
  assert.equal(result.createdRemnants[0].quantity, 1);
  assert.equal(result.movements.length, 2);
  assert.equal(result.confirmation.usedSheets, 1);
});

test('ne dopušta potvrdu ako plan ima nepostavljene komade', () => {
  const incomplete = { ...order, cuttingPlan: { materials: [{ stockId: 'slab-1', summary: { sheetCount: 1, unplaced: [{ name: 'B', quantity: 1 }] } }] } };
  assert.match(prepareCutConfirmation({ order: incomplete, materials: [stock], materialId: 'slab-1', operationId: 'CUT-002' }).error, /raspoređeni/i);
});

test('ne dopušta dvostruku potvrdu istog materijala', () => {
  const confirmed = { ...order, cuttingConfirmations: [{ materialId: 'slab-1' }] };
  assert.match(prepareCutConfirmation({ order: confirmed, materials: [stock], materialId: 'slab-1', operationId: 'CUT-003' }).error, /već je potvrđeno/i);
});

test('ne dopušta izmišljene ili premale ostatke', () => {
  assert.match(prepareCutConfirmation({ order, materials: [stock], materialId: 'slab-1', operationId: 'CUT-004', remnants: [{ length: 10, width: 30 }] }).error, /najmanje 20 cm/i);
});

test('provjerava stvarnu raspoloživu zalihu i rezervaciju prije skidanja ploče', () => {
  const insufficient = { ...stock, quantity: 0.2 };
  assert.match(prepareCutConfirmation({ order, materials: [insufficient], materialId: 'slab-1', operationId: 'CUT-005' }).error, /Nema dovoljno/i);
});
