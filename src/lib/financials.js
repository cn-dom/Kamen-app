import { calculateStageElapsedMs } from './production.js';

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const validAmount = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function calculateOrderFinancials(order, costRecords = [], productionRecords = { pieces: {} }, now = Date.now()) {
  const orderId = order?.id;
  const related = (Array.isArray(costRecords) ? costRecords : []).filter(record => record.orderId === orderId);
  const plannedCost = roundMoney(related.filter(record => record.kind === 'Planirani trošak').reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const actualCost = roundMoney(related.filter(record => record.kind === 'Stvarni trošak').reduce((sum, record) => sum + Number(record.amount || 0), 0));
  const laborCost = roundMoney(related.filter(record => record.kind === 'Stvarni trošak' && (record.categories || [record.category]).includes('Rad')).reduce((sum, record) => sum + Number(record.amount || 0), 0));

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
  return {
    orderId,
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
    productionHours: Math.round((summary.productionHours + row.productionHours) * 100) / 100,
    incompleteMaterialEstimates: summary.incompleteMaterialEstimates + (row.materialEstimateComplete ? 0 : 1)
  }), { plannedCost: 0, actualCost: 0, estimatedMaterialCost: 0, productionHours: 0, incompleteMaterialEstimates: 0 });
}
