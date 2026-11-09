import test from 'node:test';
import assert from 'node:assert/strict';
import { getProjectClosureChecklist, validateProjectClosure, createProjectClosureRecord } from '../src/lib/businessFlow.js';

const quote = {
  id: 'q-1', number: 'PON-0001', status: 'Prihvaćena', orderId: 'RN-1',
  customerName: 'Kupac', items: [
    { description: 'Granitni spomenik', quantity: 2, unit: 'kom', category: 'Materijal' },
    { description: 'Montaža', quantity: 1, unit: 'usluga', category: 'Montaža' }
  ]
};
const order = { id: 'RN-1', project: 'Spomenik', customer: 'Kupac', status: 'Završen' };
const deliveries = [{
  id: 'otp-1', quoteId: 'q-1', items: [
    { quoteLineId: 'q-1-0', quantity: 2 },
    { quoteLineId: 'q-1-1', quantity: 1 }
  ]
}];
const invoices = [{ id: 'i-1', quoteId: 'q-1', number: 'R-2026-0001', status: 'Izdano', grossTotal: 1250 }];
const payments = [{ id: 'p-1', invoiceId: 'i-1', amount: 1250 }];
const completedFieldJob = { id: 'field-2', orderId: 'RN-1', status: 'Vraćeno' };

test('project is ready only when order, production, delivery, required field work, invoice and payment are complete', () => {
  const input = { quote, order, deliveries, invoices, payments, fieldJobs: [completedFieldJob] };
  const result = getProjectClosureChecklist(input);
  assert.equal(result.ready, true);
  assert.equal(result.checks.every(check => check.complete), true);
  assert.equal(validateProjectClosure(input), '');
});

test('installation in an accepted quote requires a linked field-work record', () => {
  const input = { quote, order, deliveries, invoices, payments, fieldJobs: [] };
  const result = getProjectClosureChecklist(input);
  assert.equal(result.ready, false);
  assert.equal(result.checks.find(check => check.id === 'field').complete, false);
  assert.match(result.checks.find(check => check.id === 'field').detail, /terenski nalog nije evidentiran/);
  assert.match(validateProjectClosure(input), /Terenski rad i montaža su zaključeni/);
});

test('partial delivery, open field work, missing invoice or unpaid balance block closure', () => {
  const partial = [{ ...deliveries[0], items: [{ quoteLineId: 'q-1-0', quantity: 1 }] }];
  const pendingJob = [{ id: 'field-1', orderId: 'RN-1', status: 'Montaža u tijeku' }];
  const cases = [
    { deliveries: partial, invoices, payments, fieldJobs: [completedFieldJob] },
    { deliveries, invoices, payments, fieldJobs: pendingJob },
    { deliveries, invoices: [], payments, fieldJobs: [completedFieldJob] },
    { deliveries, invoices, payments: [{ invoiceId: 'i-1', amount: 500 }], fieldJobs: [completedFieldJob] },
    { deliveries, invoices, payments, fieldJobs: [completedFieldJob], order: { ...order, status: 'U tijeku' } }
  ];
  for (const item of cases) {
    const issue = validateProjectClosure({ quote, order: item.order || order, deliveries: item.deliveries, invoices: item.invoices, payments: item.payments, fieldJobs: item.fieldJobs });
    assert.match(issue, /Projekt se ne može zatvoriti/);
  }
});

test('closure record keeps a final checklist snapshot and cannot be duplicated', () => {
  const input = { quote, order, deliveries, invoices, payments, fieldJobs: [completedFieldJob] };
  const record = createProjectClosureRecord(input, [], '2026-11-09T12:00:00.000Z');
  assert.equal(record.status, 'Zatvoren');
  assert.equal(record.invoiceNumber, 'R-2026-0001');
  assert.equal(record.checklist.length, 7);
  assert.equal(record.checklist.every(check => check.complete), true);
  assert.throws(() => createProjectClosureRecord(input, [record]), /već zatvoren/);
});
