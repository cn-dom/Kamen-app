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

test('rezervira fizičke ostatke prema planu rezanja, a ne samo prema površini', () => {
  const remnant = { form: 'Ostatak', length: 100, width: 100 };
  const planned = [
    { length: 70, width: 70, quantity: 1, remnantBoardKeys: ['rem-1::0'] },
    { length: 70, width: 70, quantity: 1, remnantBoardKeys: ['rem-1::1'] }
  ];
  assert.equal(calculateMaterialReservation(remnant, planned), 2);
});

test('ne broji isti fizički ostatak dvaput kada prima više komada', () => {
  const remnant = { form: 'Ostatak', length: 120, width: 80 };
  const planned = [
    { length: 50, width: 30, quantity: 1, remnantBoardKeys: ['rem-1::0'] },
    { length: 50, width: 30, quantity: 1, remnantBoardKeys: ['rem-1::0'] }
  ];
  assert.equal(calculateMaterialReservation(remnant, planned), 1);
});

test('ručno dodani komadi uz automatski plan dobivaju dodatnu sigurnosnu rezervaciju', () => {
  const remnant = { form: 'Ostatak', length: 100, width: 100 };
  const mixed = [
    { length: 70, width: 70, quantity: 1, remnantBoardKeys: ['rem-1::0'] },
    { length: 20, width: 20, quantity: 1 }
  ];
  assert.equal(calculateMaterialReservation(remnant, mixed), 2);
});
