import { calculateStageElapsedMs } from './production.js';

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const validAmount = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function calculateOrderFinancials(order, costRecords = [], productionRecords = { pieces: {} }, now = Date.now(), invoices = [], payments = []) {
  const orderId = order?.id;
  const related = (Array.isArray(costRecords) ? costRecords : []).filter(record => record.orderId === orderId);
  const plannedCost = roundMoney(related.filter(record => record.kind === 'Planirani trošak').reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const actualCost = roundMoney(related.filter(record => record.kind === 'Stvarni trošak').reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const laborCost = roundMoney(related.filter(record => { const categories = Array.isArray(record.categories) ? record.categories : String(record.category || '').split(',').map(value => value.trim()); return record.kind === 'Stvarni trošak' && categories.includes('Rad'); }).reduce((sum, record) => sum + Number(record.amount || 0), 0));

  const allocations = Array.isArray(order?.materialAllocations) ? order.materialAllocations : [];
  const hasMaterialEstimate = allocations.length > 0 && allocations.every(item => validAmount(item.cost));
  const estimatedMaterialCost = hasMaterialEstimate ? roundMoney(allocations.reduce((sum, item) => sum + Number(item.cost), 0)) : (validAmount(order?.estimatedMaterialCost) ? roundMoney(order.estimatedMaterialCost) : null);

  let productionMs = 0;
  let trackedPieces = 0;
  (Array.isArray(order?.pieces) ? order.pieces : []).forEach((piece, pieceIndex) => {
    const quantity = Math.max(0, Math.min(1000, Math.floor(Number(piece.quantity) || 0)));
    for (let unitIndex = 1; unitIndex <= quantity; unitIndex += 1) {
      const record = productionRecords?.pieces?.[orderId + '::' + pieceIndex + '::' + unitIndex];
      if (!record) continue;
      trackedPieces += 1;
      Object.values(record.stages || {}).forEach(stage => { productionMs += calculateStageElapsedMs(stage, now); });
    }
  });
  const orderInvoices = (Array.isArray(invoices) ? invoices : []).filter(invoice => invoice.orderId === orderId);
  const invoiceIds = new Set(orderInvoices.map(invoice => invoice.id));
  const quoteIds = new Set(orderInvoices.map(invoice => invoice.quoteId));
  const invoiceNet = roundMoney(orderInvoices.reduce((sum, invoice) => sum + Number(invoice.netTotal || 0), 0));
  const invoiceGross = roundMoney(orderInvoices.reduce((sum, invoice) => sum + Number(invoice.grossTotal || 0), 0));
  const collected = roundMoney((Array.isArray(payments) ? payments : []).filter(payment => invoiceIds.has(payment.invoiceId) || (!payment.invoiceId && quoteIds.has(payment.quoteId))).reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0));
  const receivable = Math.max(0, roundMoney(invoiceGross - collected));
  return {
    orderId,
    invoiceCount: orderInvoices.length,
    invoiceNet,
    invoiceGross,
    collected,
    receivable,
    plannedCost,
    actualCost,
    laborCost,
    estimatedMaterialCost,
    materialEstimateComplete: hasMaterialEstimate || validAmount(order?.estimatedMaterialCost),
    productionHours: Math.round((productionMs / 3600000) * 100) / 100,
    trackedPieces
  };
}

export function summarizeFinancials(rows = []) {
  return (Array.isArray(rows) ? rows : []).reduce((summary, row) => ({
    plannedCost: roundMoney(summary.plannedCost + row.plannedCost),
    actualCost: roundMoney(summary.actualCost + row.actualCost),
    estimatedMaterialCost: roundMoney(summary.estimatedMaterialCost + (row.estimatedMaterialCost ?? 0)),
    invoiceNet: roundMoney(summary.invoiceNet + row.invoiceNet),
    invoiceGross: roundMoney(summary.invoiceGross + row.invoiceGross),
    collected: roundMoney(summary.collected + row.collected),
    receivable: roundMoney(summary.receivable + row.receivable),
    productionHours: Math.round((summary.productionHours + row.productionHours) * 100) / 100,
    incompleteMaterialEstimates: summary.incompleteMaterialEstimates + (row.materialEstimateComplete ? 0 : 1)
  }), { plannedCost: 0, actualCost: 0, estimatedMaterialCost: 0, invoiceNet: 0, invoiceGross: 0, collected: 0, receivable: 0, productionHours: 0, incompleteMaterialEstimates: 0 });
}
