import { summarizeMaterialConsumption } from './materialConsumption.js';
import { calculateStageElapsedMs } from './production.js';
import { calculateQuote } from './quotes.js';

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const validAmount = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function calculateOrderFinancials(order, costRecords = [], productionRecords = { pieces: {} }, now = Date.now(), invoices = [], payments = [], materialConsumptionRecords = [], quotes = []) {
  const orderId = order?.id;
  const related = (Array.isArray(costRecords) ? costRecords : []).filter(record => record.orderId === orderId);
  const plannedCost = roundMoney(related.filter(record => record.kind === 'Planirani trošak').reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const actualCost = roundMoney(related.filter(record => record.kind === 'Stvarni trošak').reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const manualMaterialCost = roundMoney(related.filter(record => {
    const categories = Array.isArray(record.categories) ? record.categories : String(record.category || '').split(',').map(value => value.trim());
    return record.kind === 'Stvarni trošak' && categories.includes('Materijal');
  }).reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const materialConsumption = summarizeMaterialConsumption(materialConsumptionRecords, orderId);
  // Once cutting consumption is recorded, its warehouse-based cost replaces manual material entries to avoid double counting.
  const totalActualCost = roundMoney(actualCost - (materialConsumption.recordCount ? manualMaterialCost : 0) + materialConsumption.jobMaterialCost);
  const laborCost = roundMoney(related.filter(record => { const categories = Array.isArray(record.categories) ? record.categories : String(record.category || '').split(',').map(value => value.trim()); return record.kind === 'Stvarni trošak' && categories.includes('Rad'); }).reduce((sum, record) => sum + Number(record.amount || 0), 0));

  const categoryTotals = { material: 0, labor: 0, transport: 0, processing: 0, installation: 0, equipment: 0, other: 0 };
  related.filter(record => record.kind === 'Stvarni trošak').forEach(record => {
    const categories = Array.isArray(record.categories) ? record.categories : String(record.category || '').split(',').map(value => value.trim());
    const amount = Number(record.amount || 0);
    if (categories.includes('Materijal')) categoryTotals.material += amount;
    if (categories.includes('Rad')) categoryTotals.labor += amount;
    if (categories.includes('Prijevoz')) categoryTotals.transport += amount;
    if (categories.includes('Vanjska obrada') || categories.includes('Potrošni materijal')) categoryTotals.processing += amount;
    if (categories.includes('Montaža') || categories.includes('Terenski rad')) categoryTotals.installation += amount;
    if (categories.includes('Najam stroja')) categoryTotals.equipment += amount;
    if (categories.includes('Ostalo')) categoryTotals.other += amount;
  });
  Object.keys(categoryTotals).forEach(key => { categoryTotals[key] = roundMoney(categoryTotals[key]); });

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
  const orderQuotes = (Array.isArray(quotes) ? quotes : []).filter(quote => quote.status === 'Prihvaćena' && (quote.orderId === orderId || quote.id === order?.quoteId));
  const acceptedQuote = orderQuotes.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] || null;
  const quoteTotals = acceptedQuote ? calculateQuote(acceptedQuote.items, acceptedQuote.discountPercent) : null;
  const orderInvoices = (Array.isArray(invoices) ? invoices : []).filter(invoice => invoice.orderId === orderId);
  const invoiceIds = new Set(orderInvoices.map(invoice => invoice.id));
  const quoteIds = new Set(orderInvoices.map(invoice => invoice.quoteId));
  const invoiceNet = roundMoney(orderInvoices.reduce((sum, invoice) => sum + Number(invoice.netTotal || 0), 0));
  const invoiceGross = roundMoney(orderInvoices.reduce((sum, invoice) => sum + Number(invoice.grossTotal || 0), 0));
  const collected = roundMoney((Array.isArray(payments) ? payments : []).filter(payment => invoiceIds.has(payment.invoiceId) || (!payment.invoiceId && quoteIds.has(payment.quoteId))).reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0));
  const receivable = Math.max(0, roundMoney(invoiceGross - collected));
  const netDifference = orderInvoices.length ? roundMoney(invoiceNet - totalActualCost) : 0;
  return {
    orderId,
    invoiceCount: orderInvoices.length,
    invoiceNet,
    invoiceGross,
    collected,
    receivable,
    netDifference,
    plannedCost,
    actualCost,
    manualMaterialCost,
    consumedMaterialCost: materialConsumption.materialCost,
    consumedMaterialAreaM2: materialConsumption.consumedAreaM2,
    finishedMaterialAreaM2: materialConsumption.finishedAreaM2,
    remnantMaterialAreaM2: materialConsumption.remnantAreaM2,
    wasteMaterialAreaM2: materialConsumption.wasteAreaM2,
    processLossAreaM2: materialConsumption.processLossAreaM2,
    remnantMaterialValue: materialConsumption.remnantValue,
    wasteMaterialCost: materialConsumption.wasteCost,
    jobMaterialCost: materialConsumption.jobMaterialCost,
    materialConsumptionCount: materialConsumption.recordCount,
    unpricedMaterialConsumptionCount: materialConsumption.unpricedRecordCount,
    totalActualCost,
    laborCost,
    costBreakdown: { ...categoryTotals, warehouseMaterial: materialConsumption.jobMaterialCost, total: totalActualCost },
    invoicedVat: roundMoney(invoiceGross - invoiceNet),
    realizedGrossMargin: invoiceNet ? roundMoney(invoiceNet - totalActualCost) : null,
    realizedMarginPercent: invoiceNet > 0 ? Math.round(((invoiceNet - totalActualCost) / invoiceNet) * 10000) / 100 : null,
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
    totalActualCost: roundMoney(summary.totalActualCost + Number(row.totalActualCost ?? row.actualCost ?? 0)),
    consumedMaterialCost: roundMoney(summary.consumedMaterialCost + Number(row.consumedMaterialCost || 0)),
    remnantMaterialValue: roundMoney(summary.remnantMaterialValue + Number(row.remnantMaterialValue || 0)),
    wasteMaterialCost: roundMoney(summary.wasteMaterialCost + Number(row.wasteMaterialCost || 0)),
    jobMaterialCost: roundMoney(summary.jobMaterialCost + Number(row.jobMaterialCost || 0)),
    finishedMaterialAreaM2: Math.round((summary.finishedMaterialAreaM2 + Number(row.finishedMaterialAreaM2 || 0)) * 10000) / 10000,
    remnantMaterialAreaM2: Math.round((summary.remnantMaterialAreaM2 + Number(row.remnantMaterialAreaM2 || 0)) * 10000) / 10000,
    wasteMaterialAreaM2: Math.round((summary.wasteMaterialAreaM2 + Number(row.wasteMaterialAreaM2 || 0)) * 10000) / 10000,
    processLossAreaM2: Math.round((summary.processLossAreaM2 + Number(row.processLossAreaM2 || 0)) * 10000) / 10000,
    consumedMaterialAreaM2: Math.round((summary.consumedMaterialAreaM2 + Number(row.consumedMaterialAreaM2 || 0)) * 10000) / 10000,
    unpricedMaterialConsumptionCount: summary.unpricedMaterialConsumptionCount + Number(row.unpricedMaterialConsumptionCount || 0),
    estimatedMaterialCost: roundMoney(summary.estimatedMaterialCost + (row.estimatedMaterialCost ?? 0)),
    invoiceNet: roundMoney(summary.invoiceNet + Number(row.invoiceNet || 0)),
    invoiceGross: roundMoney(summary.invoiceGross + Number(row.invoiceGross || 0)),
    collected: roundMoney(summary.collected + Number(row.collected || 0)),
    receivable: roundMoney(summary.receivable + Number(row.receivable || 0)),
    netDifference: roundMoney(summary.netDifference + Number(row.netDifference ?? (Number(row.invoiceCount || 0) > 0 ? Number(row.invoiceNet || 0) - Number(row.totalActualCost ?? row.actualCost ?? 0) : 0))),
    projectsWithInvoices: summary.projectsWithInvoices + (Number(row.invoiceCount || 0) > 0 ? 1 : 0),
    productionHours: Math.round((summary.productionHours + row.productionHours) * 100) / 100,
    incompleteMaterialEstimates: summary.incompleteMaterialEstimates + (row.materialEstimateComplete ? 0 : 1)
  }), { plannedCost: 0, actualCost: 0, totalActualCost: 0, consumedMaterialCost: 0, consumedMaterialAreaM2: 0, remnantMaterialValue: 0, wasteMaterialCost: 0, jobMaterialCost: 0, finishedMaterialAreaM2: 0, remnantMaterialAreaM2: 0, wasteMaterialAreaM2: 0, processLossAreaM2: 0, unpricedMaterialConsumptionCount: 0, estimatedMaterialCost: 0, invoiceNet: 0, invoiceGross: 0, collected: 0, receivable: 0, netDifference: 0, projectsWithInvoices: 0, productionHours: 0, incompleteMaterialEstimates: 0 });
}
