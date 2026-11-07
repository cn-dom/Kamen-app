import { calculateQuote } from './quotes.js';

const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function createInvoiceFromQuote(quote, invoices = [], date = new Date().toISOString().slice(0, 10)) {
  if (!quote?.id || quote.status !== 'Prihvaćena') throw new Error('Račun se može izdati samo za prihvaćenu ponudu.');
  if (invoices.some(invoice => invoice.quoteId === quote.id)) throw new Error('Za ovu ponudu račun je već izdan.');
  const totals = calculateQuote(quote.items, quote.discountPercent);
  if (!(totals.gross > 0)) throw new Error('Ponuda nema iznos za fakturiranje.');
  const year = String(date).slice(0, 4) || String(new Date().getFullYear());
  const sequence = invoices.filter(invoice => String(invoice.number || '').startsWith('R-' + year + '-')).length + 1;
  return {
    id: 'RAC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
    number: 'R-' + year + '-' + String(sequence).padStart(4, '0'),
    quoteId: quote.id,
    quoteNumber: quote.number,
    orderId: quote.orderId || '',
    customerId: quote.customerId || '',
    customerName: quote.customerName || '',
    customerAddress: quote.customerAddress || '',
    customerOib: quote.customerOib || '',
    date,
    dueDate: quote.paymentDueDate || (() => { const due = new Date(String(date) + 'T12:00:00'); due.setDate(due.getDate() + 30); return due.toISOString().slice(0, 10); })(),
    items: (totals.lines || []).map(line => ({ description: line.description, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice, vatRate: line.vatRate, net: line.netAfterDiscount, vat: line.vat, gross: line.gross })),
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    netTotal: round(totals.net),
    vatTotal: round(totals.vat),
    grossTotal: round(totals.gross),
    status: 'Izdano',
    createdAt: new Date().toISOString()
  };
}

export function summarizeInvoice(invoice, payments = []) {
  const related = (Array.isArray(payments) ? payments : []).filter(payment =>
    payment.invoiceId === invoice?.id || (!payment.invoiceId && payment.quoteId === invoice?.quoteId)
  );
  const paid = round(related.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0));
  const total = round(invoice?.grossTotal || 0);
  return { total, paid, due: Math.max(0, round(total - paid)), status: paid >= total ? 'Plaćeno' : paid > 0 ? 'Djelomično plaćeno' : 'Neplaćeno' };
}

export function getInvoiceReceivables(invoices = [], payments = [], today = new Date().toISOString().slice(0, 10)) {
  return (Array.isArray(invoices) ? invoices : []).map(invoice => {
    const balance = summarizeInvoice(invoice, payments);
    const dueDate = invoice.dueDate || invoice.date || '';
    const todayMs = Date.parse(String(today).slice(0, 10) + 'T00:00:00Z');
    const dueMs = dueDate ? Date.parse(String(dueDate).slice(0, 10) + 'T00:00:00Z') : NaN;
    const daysOverdue = balance.due > 0 && Number.isFinite(todayMs) && Number.isFinite(dueMs) && dueMs < todayMs
      ? Math.floor((todayMs - dueMs) / 86400000) : 0;
    return { invoice, ...balance, dueDate, daysOverdue, isOverdue: daysOverdue > 0 };
  }).filter(row => row.due > 0);
}

export function summarizeReceivables(invoices = [], payments = [], today) {
  const rows = getInvoiceReceivables(invoices, payments, today);
  return {
    outstanding: round(rows.reduce((sum, row) => sum + row.due, 0)),
    overdue: round(rows.filter(row => row.isOverdue).reduce((sum, row) => sum + row.due, 0)),
    overdueCount: rows.filter(row => row.isOverdue).length,
    openCount: rows.length
  };
}
