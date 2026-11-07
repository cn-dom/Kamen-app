import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderFinancials, summarizeFinancials } from '../src/lib/financials.js';

test('izračunava plan, stvarne troškove i procjenu materijala odvojeno', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-001', estimatedMaterialCost: 125.5, pieces: [] },
    [
      { orderId: 'RN-001', kind: 'Planirani trošak', amount: 300 },
      { orderId: 'RN-001', kind: 'Stvarni trošak', amount: 80, categories: ['Rad'] },
      { orderId: 'RN-002', kind: 'Stvarni trošak', amount: 999 }
    ],
    { pieces: {} }
  );
  assert.equal(result.plannedCost, 300);
  assert.equal(result.actualCost, 80);
  assert.equal(result.laborCost, 80);
  assert.equal(result.estimatedMaterialCost, 125.5);
  assert.equal(result.materialEstimateComplete, true);
});

test('ne prikazuje lažnu procjenu materijala ako neka alokacija nema nabavnu cijenu', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-002', materialAllocations: [{ cost: 40 }, { cost: null }], pieces: [] },
    [], { pieces: {} }
  );
  assert.equal(result.estimatedMaterialCost, null);
  assert.equal(result.materialEstimateComplete, false);
});

test('računa stvarno evidentirano vrijeme svih faza pojedinačnih komada', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-003', pieces: [{ quantity: 2 }] },
    [],
    { pieces: {
      'RN-003::0::1': { stages: { Pilanje: { sessions: [{ startedAt: '2026-01-01T08:00:00.000Z', endedAt: '2026-01-01T09:30:00.000Z' }] } } },
      'RN-003::0::2': { stages: { Poliranje: { sessions: [{ startedAt: '2026-01-01T10:00:00.000Z', endedAt: '2026-01-01T11:15:00.000Z' }] } } }
    } }
  );
  assert.equal(result.productionHours, 2.75);
  assert.equal(result.trackedPieces, 2);
});

test('sažima financijske pokazatelje više projekata', () => {
  const summary = summarizeFinancials([
    { plannedCost: 100, actualCost: 80, estimatedMaterialCost: 40, productionHours: 2, materialEstimateComplete: true },
    { plannedCost: 50, actualCost: 60, estimatedMaterialCost: null, productionHours: 1.5, materialEstimateComplete: false }
  ]);
  assert.deepEqual(summary, { plannedCost: 150, actualCost: 140, estimatedMaterialCost: 40, productionHours: 3.5, incompleteMaterialEstimates: 1 });
});

test('prepoznaje kategoriju rada i u starijem zapisu', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-004', pieces: [] },
    [{ orderId: 'RN-004', kind: 'Stvarni trošak', category: 'Materijal, Rad', amount: 45 }],
    { pieces: {} }
  );
  assert.equal(result.laborCost, 45);
});
