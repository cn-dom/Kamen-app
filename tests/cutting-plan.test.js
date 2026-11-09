import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCuttingPlanGroups, summarizeCuttingPlan } from '../src/lib/cuttingPlan.js';

const slab = { id: 'slab-1', name: 'Impala', form: 'Ploča', length: 302, width: 224, thickness: 3, quantity: 6.8 };

test('pretvara mjere u milimetre i ostavlja 1 cm obrezivanja sa svake strane', () => {
  const groups = buildCuttingPlanGroups([
    { name: 'Vertikala', materialId: slab.id, length: 120, width: 30, thickness: 3, quantity: 2 }
  ], [slab]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].sheet, { name: 'Impala', width: 3000, height: 2220, kerf: 4, cost: 0 });
  assert.deepEqual(groups[0].demands[0], { name: 'Vertikala', width: 1200, height: 300, quantity: 2, can_rotate: false });
});

test('grupira komade prema odabranoj ploči i ne miješa materijale', () => {
  const second = { ...slab, id: 'slab-2', name: 'Mramor', type: 'Mramor' };
  const groups = buildCuttingPlanGroups([
    { name: 'A', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1 },
    { name: 'B', materialId: second.id, length: 40, width: 20, thickness: 3, quantity: 2 }
  ], [slab, second]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(group => group.demands.length), [1, 1]);
});

test('preskače nevaljane dimenzije, količine i neusklađene debljine', () => {
  const groups = buildCuttingPlanGroups([
    { name: 'Krivi', materialId: slab.id, length: 50, width: 30, thickness: 2, quantity: 1 },
    { name: 'Bez količine', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1.5 }
  ], [slab]);
  assert.equal(groups.length, 0);
});

test('sažetak jasno izdvaja nepostavljene zahtjeve i planove po ploči', () => {
  const summary = summarizeCuttingPlan({
    sheet_count: 1, total_waste_area: 500000, total_kerf_area: 20000, guillotine: true,
    layouts: [{ sheet_name: 'Impala', width: 3000, height: 2200, placements: [{ name: 'A' }] }],
    unplaced: [{ name: 'B', quantity: 1 }]
  }, { sheet_plans: [{ num_cuts: 3 }] });
  assert.equal(summary.sheetCount, 1);
  assert.equal(summary.placedCount, 1);
  assert.equal(summary.wasteM2, 0.5);
  assert.equal(summary.kerfM2, 0.02);
  assert.equal(summary.sheets[0].plan.num_cuts, 3);
  assert.equal(summary.unplaced.length, 1);
});
