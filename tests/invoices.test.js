import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvoiceFromQuote, summarizeInvoice } from '../src/lib/invoices.js';

const quote = {
  id: 'q-1', number: 'PON-0001', status: 'Prihvaćena', orderId: 'RN-1',
  customerName: 'Kupac', items: [{ description: 'Granit', quantity: 2, unit: 'm²', unitPrice: 100, vatRate: 25 }]
};

test('creates an immutable invoice snapshot from an accepted quote', () => {
  const invoice = createInvoiceFromQuote(quote, [], '2026-11-07');
  assert.equal(invoice.number, 'R-2026-0001');
  assert.equal(invoice.orderId, 'RN-1');
  assert.equal(invoice.netTotal, 200);
  assert.equal(invoice.vatTotal, 50);
  assert.equal(invoice.grossTotal, 250);
  assert.equal(invoice.status, 'Izdano');
});

test('does not issue invoices for unaccepted quotes or duplicate quote invoices', () => {
  assert.throws(() => createInvoiceFromQuote({ ...quote, status: 'Poslana' }), /prihvaćenu/);
  assert.throws(() => createInvoiceFromQuote(quote, [{ quoteId: quote.id }]), /već izdan/);
});

test('summarizes partial, full and legacy quote-linked payments', () => {
  const invoice = { id: 'i-1', quoteId: 'q-1', grossTotal: 250 };
  assert.deepEqual(summarizeInvoice(invoice, [{ invoiceId: 'i-1', amount: 100 }]), { total: 250, paid: 100, due: 150, status: 'Djelomično plaćeno' });
  assert.equal(summarizeInvoice(invoice, [{ quoteId: 'q-1', amount: 250 }]).status, 'Plaćeno');
});
