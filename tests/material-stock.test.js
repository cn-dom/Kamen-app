import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaterialReservation, calculateStockCarryingValue, materialAreaM2 } from '../src/lib/materialStock.js';

test('računa površinu pojedinačnog ostatka u m²', () => {
  assert.equal(materialAreaM2({ length: 120, width: 80 }), 0.96);
  assert.equal(materialAreaM2({ length: 0, width: 80 }), 0);
});

test('vrednuje zalihu ostataka prema površini, količini i spremljenoj nabavnoj cijeni', () => {
  assert.equal(calculateStockCarryingValue({ form: 'Ostatak', length: 120, width: 80, quantity: 2, pricePerM2: 40 }), 76.8);
  assert.equal(calculateStockCarryingValue({ form: 'Ostatak', length: 120, width: 80, quantity: 2, pricePerM2: null }), null);
  assert.equal(calculateStockCarryingValue({ form: 'Ostatak', length: 120, width: 80, quantity: 2, pricePerM2: -5 }), null);
});

test('rezervira uporabne ostatke kao cijele fizičke komade', () => {
  const remnant = { form: 'Ostatak', length: 100, width: 100 };
  assert.equal(calculateMaterialReservation(remnant, [{ length: 40, width: 50, quantity: 2 }]), 1);
  assert.equal(calculateMaterialReservation(remnant, [{ length: 80, width: 80, quantity: 2 }]), 2);
});

test('zadržava rezervaciju ploča u stotinkama kao dosad', () => {
  const slab = { form: 'Ploča', length: 300, width: 200 };
  assert.equal(calculateMaterialReservation(slab, [{ length: 100, width: 100, quantity: 1 }]), 0.17);
});
