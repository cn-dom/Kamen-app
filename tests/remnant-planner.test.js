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

test('dijeli jednu stavku između više ostataka i zadržava izvornu količinu', () => {
  const pieces = [{ name: 'Serija', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 3 }];
  const first = remnant({ id: 'rem-1', name: 'Ostatak A', length: 60, width: 40, quantity: 1 });
  const second = remnant({ id: 'rem-2', name: 'Ostatak B', length: 60, width: 40, quantity: 1 });
  const result = suggestRemnantAssignments(pieces, [slab, first, second]);
  assert.equal(result.assignedCount, 2);
  assert.deepEqual(result.pieces.map(piece => [piece.materialId, piece.quantity]), [['rem-1', 1], ['rem-2', 1], ['slab-1', 1]]);
  assert.equal(result.pieces.reduce((sum, piece) => sum + piece.quantity, 0), 3);
});

test('može rasporediti količinu preko više fizičkih komada istog ostatka', () => {
  const pieces = [{ name: 'Serija', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 2 }];
  const stock = remnant({ length: 60, width: 40, quantity: 2 });
  const result = suggestRemnantAssignments(pieces, [slab, stock]);
  assert.equal(result.assignedCount, 2);
  assert.deepEqual(result.pieces.map(piece => [piece.materialId, piece.quantity]), [['rem-1', 2]]);
});

test('zanemaruje arhivirane ostatke', () => {
  const pieces = [{ name: 'Komad', materialId: slab.id, length: 50, width: 30, thickness: 3, quantity: 1 }];
  const result = suggestRemnantAssignments(pieces, [slab, remnant({ archived: true })]);
  assert.equal(result.assignedCount, 0);
  assert.equal(result.pieces[0].materialId, slab.id);
});
