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

test('tracks open and overdue receivables by invoice due date', async () => {
  const { getInvoiceReceivables, summarizeReceivables } = await import('../src/lib/invoices.js');
  const invoices = [
    { id: 'old', quoteId: 'q-old', number: 'R-OLD', grossTotal: 250, dueDate: '2026-11-01' },
    { id: 'today', quoteId: 'q-today', number: 'R-TODAY', grossTotal: 100, dueDate: '2026-11-07' },
    { id: 'future', quoteId: 'q-future', number: 'R-FUTURE', grossTotal: 80, dueDate: '2026-11-20' },
    { id: 'paid', quoteId: 'q-paid', number: 'R-PAID', grossTotal: 50, dueDate: '2026-10-01' }
  ];
  const payments = [{ invoiceId: 'old', amount: 100 }, { invoiceId: 'paid', amount: 50 }];
  const rows = getInvoiceReceivables(invoices, payments, '2026-11-07');
  assert.equal(rows.length, 3);
  assert.equal(rows.find(row => row.invoice.id === 'old').daysOverdue, 6);
  assert.equal(rows.find(row => row.invoice.id === 'today').isOverdue, false);
  assert.equal(rows.find(row => row.invoice.id === 'future').daysOverdue, 0);
  assert.deepEqual(summarizeReceivables(invoices, payments, '2026-11-07'), {
    outstanding: 330, overdue: 150, overdueCount: 1, openCount: 3
  });
});
