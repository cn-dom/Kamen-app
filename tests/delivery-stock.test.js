import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDeliveryToFinishedProducts } from '../src/lib/delivery-stock.js';

test('otpremnica skida samo povezani gotovi proizvod i bilježi promet', () => {
  const result = applyDeliveryToFinishedProducts(
    { id: 'd1', number: 'OTP-0001', date: '2026-11-07', orderId: 'RN-1', items: [{ quoteLineId: 'q1-0', productId: 'p1', quantity: 2, unit: 'kom' }] },
    [{ id: 'p1', name: 'Granitna ploča', quantity: 5, stockQuantity: 5, unit: 'kom', status: 'Na zalihi' }],
    []
  );
  assert.equal(result.products[0].stockQuantity, 3);
  assert.equal(result.products[0].soldQuantity, 2);
  assert.equal(result.movements[0].deliveryNumber, 'OTP-0001');
  assert.equal(result.applied, 2);
});

test('otpremnica ne može izdati više od raspoložive količine', () => {
  assert.throws(() => applyDeliveryToFinishedProducts(
    { id: 'd2', number: 'OTP-0002', date: '2026-11-07', items: [{ quoteLineId: 'q2-0', productId: 'p1', quantity: 3, unit: 'kom' }] },
    [{ id: 'p1', name: 'Vaza', quantity: 2, stockQuantity: 2, unit: 'kom', status: 'Na zalihi' }],
    []
  ), /Nema dovoljno zalihe/);
});

test('ponovljeno knjiženje iste otpremnice odbija duplo skidanje', () => {
  assert.throws(() => applyDeliveryToFinishedProducts(
    { id: 'd1', number: 'OTP-0001', items: [{ quoteLineId: 'q1-0', productId: 'p1', quantity: 1, unit: 'kom' }] },
    [{ id: 'p1', name: 'Ploča', quantity: 2, stockQuantity: 2, unit: 'kom' }],
    [{ id: 'd1-q1-0', deliveryId: 'd1', kind: 'Isporuka gotovog proizvoda' }]
  ), /već je proknjižena/);
});

test('ne mijenja zalihu za stavke bez povezanog proizvoda', () => {
  const products = [{ id: 'p1', name: 'Ploča', quantity: 4, stockQuantity: 4, unit: 'kom' }];
  const result = applyDeliveryToFinishedProducts(
    { id: 'd3', number: 'OTP-0003', items: [{ quoteLineId: 'q3-0', description: 'Montaža', quantity: 1, unit: 'usluga' }] },
    products,
    []
  );
  assert.equal(result.products[0].stockQuantity, 4);
  assert.equal(result.movements.length, 0);
});
