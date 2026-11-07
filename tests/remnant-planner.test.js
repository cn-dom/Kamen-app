import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestRemnantAssignments } from '../src/lib/remnantPlanner.js';

const slab = { id: 'slab-1', name: 'Granit nova ploča', type: 'Granit', form: 'Ploča', thickness: 3, length: 300, width: 200, quantity: 2 };
const remnant = (overrides = {}) => ({ id: 'rem-1', name: 'Granit ostatak', type: 'Granit', form: 'Ostatak', thickness: 3, length: 120, width: 80, quantity: 1, ...overrides });

test('dodjeljuje više komada u isti ostatak ako fizički stanu', () => {
  const pieces = [
    { name: 'Gazište', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1 },
    { name: 'Klupčica', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1 }
  ];
  const result = suggestRemnantAssignments(pieces, [slab, remnant()]);
  assert.equal(result.assignedCount, 2);
  assert.deepEqual(result.pieces.map(piece => piece.materialId), ['rem-1', 'rem-1']);
});

test('ne dodjeljuje ostatak ako komad ne stane niti uz rotaciju', () => {
  const pieces = [{ name: 'Veliki komad', materialId: slab.id, length: 150, width: 90, thickness: 3, quantity: 1 }];
  const result = suggestRemnantAssignments(pieces, [slab, remnant()]);
  assert.equal(result.assignedCount, 0);
  assert.equal(result.pieces[0].materialId, slab.id);
});

test('poštuje debljinu i vrstu materijala', () => {
  const pieces = [{ name: 'Komad', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1 }];
  const wrongThickness = remnant({ thickness: 2 });
  const wrongType = remnant({ id: 'rem-2', type: 'Mramor' });
  const result = suggestRemnantAssignments(pieces, [slab, wrongThickness, wrongType]);
  assert.equal(result.assignedCount, 0);
  assert.equal(result.pieces[0].materialId, slab.id);
});

test('ne dijeli jednu stavku između više različitih ostataka', () => {
  const pieces = [{ name: 'Serija', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 2 }];
  const oneSmallRemnant = remnant({ length: 60, width: 40, quantity: 1 });
  const result = suggestRemnantAssignments(pieces, [slab, oneSmallRemnant]);
  assert.equal(result.assignedCount, 0);
  assert.equal(result.pieces[0].materialId, slab.id);
});

test('zanemaruje arhivirane ostatke', () => {
  const pieces = [{ name: 'Komad', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1 }];
  const result = suggestRemnantAssignments(pieces, [slab, remnant({ archived: true })]);
  assert.equal(result.assignedCount, 0);
});
