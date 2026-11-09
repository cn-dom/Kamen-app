const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const TERMINAL_FIELD_STATUSES = new Set(['Završeno', 'Vraćeno']);

export function getProjectClosureChecklist({
  quote,
  order,
  deliveries = [],
  invoices = [],
  payments = [],
  fieldJobs = []
} = {}) {
  const accepted = quote?.status === 'Prihvaćena';
  const linkedOrder = Boolean(quote?.orderId && order?.id === quote.orderId);
  const productionComplete = linkedOrder && order?.status === 'Završen';
  const quoteLines = Array.isArray(quote?.items) ? quote.items : [];
  const deliveryChecks = quoteLines.map((line, index) => {
    const quoteLineId = String(quote.id) + '-' + index;
    const delivered = round(deliveries
      .filter(note => note.quoteId === quote.id)
      .flatMap(note => Array.isArray(note.items) ? note.items : [])
      .filter(item => item.quoteLineId === quoteLineId)
      .reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0));
    const required = Math.max(0, Number(line.quantity) || 0);
    return { description: line.description || 'Stavka ' + (index + 1), required, delivered, complete: required > 0 && delivered + 0.0005 >= required };
  });
  const deliveryComplete = quoteLines.length > 0 && deliveryChecks.every(line => line.complete);
  const invoice = invoices.find(item => item.quoteId === quote?.id);
  const invoiceIssued = Boolean(invoice && invoice.status === 'Izdano');
  const relatedPayments = invoice
    ? payments.filter(payment => payment.invoiceId === invoice.id || (!payment.invoiceId && payment.quoteId === quote?.id))
    : [];
  const paid = round(relatedPayments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0));
  const invoiceTotal = round(invoice?.grossTotal || 0);
  const paymentComplete = invoiceIssued && invoiceTotal > 0 && paid + 0.005 >= invoiceTotal;
  const relatedFieldJobs = fieldJobs.filter(job => job.orderId === quote?.orderId);
  const requiresFieldWork = quoteLines.some(line =>
    line.requiresFieldWork === true || String(line.category || '').trim().toLocaleLowerCase('hr') === 'montaža'
  );
  const fieldJobsComplete = relatedFieldJobs.every(job => TERMINAL_FIELD_STATUSES.has(job.status));
  const fieldComplete = fieldJobsComplete && (!requiresFieldWork || relatedFieldJobs.length > 0);
  const fieldDetail = relatedFieldJobs.length
    ? relatedFieldJobs.length + ' terenskih naloga · ' + (fieldJobsComplete ? 'svi zaključeni' : 'postoji otvoren terenski nalog')
    : requiresFieldWork
      ? 'Ponuda uključuje montažu, ali terenski nalog nije evidentiran'
      : 'Nije evidentiran zaseban terenski nalog';

  const checks = [
    { id: 'accepted', label: 'Ponuda je prihvaćena', complete: accepted, detail: accepted ? quote.number : 'Ponuda još nije prihvaćena' },
    { id: 'order', label: 'Radni nalog je povezan', complete: linkedOrder, detail: linkedOrder ? order.id : 'Poveži prihvaćenu ponudu s radnim nalogom' },
    { id: 'production', label: 'Proizvodnja i kontrola kvalitete su završene', complete: productionComplete, detail: productionComplete ? 'Radni nalog je završen' : (order ? 'Status naloga: ' + order.status : 'Nedostaje povezani radni nalog') },
    { id: 'delivery', label: 'Sve ugovorene stavke su isporučene', complete: deliveryComplete, detail: deliveryChecks.map(line => line.description + ': ' + line.delivered + '/' + line.required).join(' · ') || 'Ponuda nema stavki' },
    { id: 'field', label: 'Terenski rad i montaža su zaključeni', complete: fieldComplete, detail: fieldDetail },
    { id: 'invoice', label: 'Račun je izdan', complete: invoiceIssued, detail: invoice ? invoice.number : 'Račun nije izdan' },
    { id: 'payment', label: 'Račun je u cijelosti naplaćen', complete: paymentComplete, detail: invoiceIssued ? 'Naplaćeno ' + paid.toFixed(2) + ' / ' + invoiceTotal.toFixed(2) + ' €' : 'Čeka izdavanje računa' }
  ];
  return {
    checks,
    ready: checks.every(check => check.complete),
    deliveryChecks,
    invoice,
    paid,
    invoiceTotal,
    relatedFieldJobs
  };
}

export function validateProjectClosure(input) {
  if (!input?.quote?.id) return 'Nedostaje ponuda projekta.';
  if (!input?.order || input.order.id !== input.quote.orderId) return 'Projekt nema povezan radni nalog.';
  const checklist = getProjectClosureChecklist(input);
  const incomplete = checklist.checks.filter(check => !check.complete);
  return incomplete.length
    ? 'Projekt se ne može zatvoriti. Nedovršeno: ' + incomplete.map(check => check.label).join('; ') + '.'
    : '';
}

export function createProjectClosureRecord(input, existingClosures = [], timestamp = new Date().toISOString()) {
  const issue = validateProjectClosure(input);
  if (issue) throw new Error(issue);
  const quote = input.quote;
  if (existingClosures.some(record => record.quoteId === quote.id)) throw new Error('Projekt je već zatvoren.');
  const summary = getProjectClosureChecklist(input);
  return {
    id: 'ZAT-' + String(quote.number || quote.id) + '-' + new Date(timestamp).getTime(),
    quoteId: quote.id,
    quoteNumber: quote.number || '',
    orderId: input.order.id,
    customerName: quote.customerName || input.order.customer || '',
    closedAt: timestamp,
    invoiceId: summary.invoice.id,
    invoiceNumber: summary.invoice.number,
    invoiceTotal: summary.invoiceTotal,
    paidTotal: summary.paid,
    deliveryChecks: summary.deliveryChecks.map(line => ({ ...line })),
    checklist: summary.checks.map(check => ({ ...check })),
    status: 'Zatvoren'
  };
}
