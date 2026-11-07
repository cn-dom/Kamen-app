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
    dueDate: quote.paymentDueDate || '',
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
