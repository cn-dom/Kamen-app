import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderFinancials, summarizeFinancials } from '../src/lib/financials.js';
import { createMaterialConsumptionRecord } from '../src/lib/materialConsumption.js';

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
  assert.deepEqual(summary, { plannedCost: 150, actualCost: 140, totalActualCost: 140, consumedMaterialCost: 0, consumedMaterialAreaM2: 0, remnantMaterialValue: 0, wasteMaterialCost: 0, jobMaterialCost: 0, finishedMaterialAreaM2: 0, remnantMaterialAreaM2: 0, wasteMaterialAreaM2: 0, processLossAreaM2: 0, unpricedMaterialConsumptionCount: 0, estimatedMaterialCost: 40, invoiceNet: 0, invoiceGross: 0, collected: 0, receivable: 0, netDifference: 0, projectsWithInvoices: 0, productionHours: 3.5, incompleteMaterialEstimates: 1 });
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


test('obračunava trošak potrošene ploče prema nabavnoj cijeni zabilježenoj pri pilanju', () => {
  const consumption = createMaterialConsumptionRecord({
    id: 'UT-1', orderId: 'RN-008', materialId: 'MAT-1', materialName: 'Granit',
    usedQuantity: 0.5, boardLengthCm: 305, boardWidthCm: 145, pricePerM2: 50,
    date: '2026-11-07T10:00:00.000Z'
  });
  assert.equal(consumption.boardAreaM2, 4.4225);
  assert.equal(consumption.consumedAreaM2, 2.2113);
  assert.equal(consumption.materialCost, 110.57);
});

test('automatski trošak pilanja zamjenjuje ručni trošak materijala radi izbjegavanja dvostrukog obračuna', () => {
  const consumption = createMaterialConsumptionRecord({
    id: 'UT-2', orderId: 'RN-009', materialId: 'MAT-2', materialName: 'Mramor',
    usedQuantity: 1, boardLengthCm: 300, boardWidthCm: 150, pricePerM2: 40
  });
  const result = calculateOrderFinancials(
    { id: 'RN-009', pieces: [] },
    [
      { orderId: 'RN-009', kind: 'Stvarni trošak', amount: 100, categories: ['Materijal'] },
      { orderId: 'RN-009', kind: 'Stvarni trošak', amount: 70, categories: ['Rad'] }
    ],
    { pieces: {} }, Date.now(),
    [{ id: 'R-9', orderId: 'RN-009', netTotal: 500, grossTotal: 625 }],
    [], [consumption]
  );
  assert.equal(result.actualCost, 170);
  assert.equal(result.manualMaterialCost, 100);
  assert.equal(result.consumedMaterialCost, 180);
  assert.equal(result.totalActualCost, 250);
  assert.equal(result.netDifference, 250);
});

test('bilježi pilanje bez cijene kao nepotpun trošak, bez izmišljanja iznosa', () => {
  const consumption = createMaterialConsumptionRecord({
    id: 'UT-3', orderId: 'RN-010', materialId: 'MAT-3', materialName: 'Kvarcit',
    usedQuantity: 1, boardLengthCm: 300, boardWidthCm: 150, pricePerM2: null
  });
  const result = calculateOrderFinancials(
    { id: 'RN-010', pieces: [] }, [], { pieces: {} }, Date.now(),
    [{ id: 'R-10', orderId: 'RN-010', netTotal: 300, grossTotal: 375 }], [], [consumption]
  );
  assert.equal(result.consumedMaterialCost, 0);
  assert.equal(result.unpricedMaterialConsumptionCount, 1);
  assert.equal(result.totalActualCost, 0);
  assert.equal(result.netDifference, 300);
});


test('raspoređuje nabavnu vrijednost na gotove komade, ostatke i otpad te računa iskoristivost', () => {
  const record = createMaterialConsumptionRecord({
    id: 'UT-YIELD-1', orderId: 'RN-YIELD', materialId: 'MAT-YIELD', materialName: 'Granit',
    usedQuantity: 1, boardLengthCm: 300, boardWidthCm: 150, pricePerM2: 40,
    outputs: [
      { id: 'A', name: 'Grobna ploča', form: 'Komad', length: 200, width: 100, quantity: 1 },
      { id: 'B', name: 'Ostatak', form: 'Ostatak', length: 100, width: 100, quantity: 1 },
      { id: 'C', name: 'Otpad', form: 'Otpad', length: 100, width: 50, quantity: 1 }
    ]
  });
  assert.equal(record.consumedAreaM2, 4.5);
  assert.equal(record.finishedAreaM2, 2);
  assert.equal(record.remnantAreaM2, 1);
  assert.equal(record.wasteAreaM2, 0.5);
  assert.equal(record.processLossAreaM2, 1);
  assert.equal(record.finishedYieldPercent, 44.44);
  assert.equal(record.reusableYieldPercent, 66.67);
  assert.equal(record.wastePercent, 33.33);
  assert.equal(record.materialCost, 180);
  assert.equal(record.remnantValue, 40);
  assert.equal(record.wasteCost, 60);
  assert.equal(record.jobMaterialCost, 140);
});

test('ne dopušta da izlazna površina pilanja premaši ulaznu površinu ploče', () => {
  assert.throws(() => createMaterialConsumptionRecord({
    id: 'UT-YIELD-2', orderId: 'RN-YIELD', materialId: 'MAT-YIELD', usedQuantity: 1,
    boardLengthCm: 100, boardWidthCm: 100, pricePerM2: 25,
    outputs: [{ id: 'X', form: 'Komad', length: 120, width: 100, quantity: 1 }]
  }), /veći je od potrošene površine/);
});

test('umanjuje stvarni trošak radnog naloga za vrijednost uporabnog ostatka', () => {
  const consumption = createMaterialConsumptionRecord({
    id: 'UT-YIELD-3', orderId: 'RN-YIELD-3', materialId: 'MAT-YIELD-3', usedQuantity: 1,
    boardLengthCm: 300, boardWidthCm: 150, pricePerM2: 40,
    outputs: [
      { id: 'A', form: 'Komad', length: 200, width: 100, quantity: 1 },
      { id: 'B', form: 'Ostatak', length: 100, width: 100, quantity: 1 }
    ]
  });
  const result = calculateOrderFinancials(
    { id: 'RN-YIELD-3', pieces: [] }, [], { pieces: {} }, Date.now(),
    [{ id: 'R-Y3', orderId: 'RN-YIELD-3', netTotal: 500, grossTotal: 625 }], [], [consumption]
  );
  assert.equal(result.consumedMaterialCost, 180);
  assert.equal(result.remnantMaterialValue, 40);
  assert.equal(result.jobMaterialCost, 140);
  assert.equal(result.totalActualCost, 140);
  assert.equal(result.netDifference, 360);
});


test('razdvaja stvarne troškove po vrstama i izračunava PDV i realiziranu maržu', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-008', pieces: [] },
    [
      { orderId: 'RN-008', kind: 'Stvarni trošak', amount: 120, categories: ['Rad'] },
      { orderId: 'RN-008', kind: 'Stvarni trošak', amount: 45, categories: ['Prijevoz'] },
      { orderId: 'RN-008', kind: 'Stvarni trošak', amount: 80, categories: ['Vanjska obrada'] },
      { orderId: 'RN-008', kind: 'Stvarni trošak', amount: 30, categories: ['Montaža'] },
      { orderId: 'RN-008', kind: 'Stvarni trošak', amount: 25, categories: ['Najam stroja'] }
    ],
    { pieces: {} },
    Date.now(),
    [{ id: 'R-8', orderId: 'RN-008', netTotal: 500, grossTotal: 625 }],
    []
  );
  assert.deepEqual(result.costBreakdown, {
    material: 0, labor: 120, transport: 45, processing: 80,
    installation: 30, equipment: 25, other: 0,
    warehouseMaterial: 0, total: 300
  });
  assert.equal(result.invoicedVat, 125);
  assert.equal(result.realizedGrossMargin, 200);
  assert.equal(result.realizedMarginPercent, 40);
});

test('ne prikazuje maržu kada projekt još nema izdani račun', () => {
  const result = calculateOrderFinancials(
    { id: 'RN-009', pieces: [] },
    [{ orderId: 'RN-009', kind: 'Stvarni trošak', amount: 100 }],
    { pieces: {} }
  );
  assert.equal(result.realizedGrossMargin, null);
  assert.equal(result.realizedMarginPercent, null);
});
