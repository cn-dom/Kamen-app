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
  assert.deepEqual(summary, { plannedCost: 150, actualCost: 140, estimatedMaterialCost: 40, invoiceNet: 0, invoiceGross: 0, collected: 0, receivable: 0, netDifference: -140, projectsWithInvoices: 0, productionHours: 3.5, incompleteMaterialEstimates: 1 });
});

test('prepoznaje kategoriju rada i u starijem zapisu', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-004', pieces: [] },
    [{ orderId: 'RN-004', kind: 'Stvarni trošak', category: 'Materijal, Rad', amount: 45 }],
    { pieces: {} }
  );
  assert.equal(result.laborCost, 45);
});


test('povezuje izdane račune i stvarne uplate s radnim nalogom', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-005', pieces: [] }, [], { pieces: {} }, Date.now(),
    [
      { id: 'R-1', quoteId: 'P-1', orderId: 'RN-005', netTotal: 200, grossTotal: 250 },
      { id: 'R-2', quoteId: 'P-2', orderId: 'RN-005', netTotal: 100, grossTotal: 125 },
      { id: 'R-3', quoteId: 'P-3', orderId: 'RN-OTHER', netTotal: 500, grossTotal: 625 }
    ],
    [{ invoiceId: 'R-1', amount: 100 }, { quoteId: 'P-2', amount: 125 }, { invoiceId: 'R-3', amount: 625 }]
  );
  assert.equal(result.invoiceCount, 2);
  assert.equal(result.invoiceNet, 300);
  assert.equal(result.invoiceGross, 375);
  assert.equal(result.collected, 225);
  assert.equal(result.receivable, 150);
  assert.equal(result.netDifference, 300);
});


test('izračunava neto razliku po projektu bez dvostrukog uračunavanja procjene materijala', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-006', estimatedMaterialCost: 120, pieces: [] },
    [{ orderId: 'RN-006', kind: 'Stvarni trošak', amount: 180, categories: ['Rad', 'Prijevoz'] }],
    { pieces: {} },
    Date.now(),
    [{ id: 'R-6', orderId: 'RN-006', netTotal: 500, grossTotal: 625 }],
    [{ invoiceId: 'R-6', amount: 300 }]
  );
  assert.equal(result.invoiceNet, 500);
  assert.equal(result.actualCost, 180);
  assert.equal(result.estimatedMaterialCost, 120);
  assert.equal(result.netDifference, 320);
  assert.equal(result.receivable, 325);
});

test('neto razlika može biti negativna kada su evidentirani troškovi veći od neto računa', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-007', pieces: [] },
    [{ orderId: 'RN-007', kind: 'Stvarni trošak', amount: 450 }],
    { pieces: {} },
    Date.now(),
    [{ id: 'R-7', orderId: 'RN-007', netTotal: 300, grossTotal: 375 }],
    []
  );
  assert.equal(result.netDifference, -150);
});
