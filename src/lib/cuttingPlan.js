const roundMm = value => Math.round(Number(value) * 10);

export function buildCuttingPlanGroups(pieces = [], materials = [], machine = {}) {
  const kerfMm = Number.isFinite(Number(machine.kerfMm)) ? Math.max(0, Number(machine.kerfMm)) : 4;
  const trimMm = Number.isFinite(Number(machine.trimMm)) ? Math.max(0, Number(machine.trimMm)) : 10;
  const groups = new Map();
  for (const [index, piece] of (Array.isArray(pieces) ? pieces : []).entries()) {
    const stock = (Array.isArray(materials) ? materials : []).find(item => item.id === piece.materialId);
    const length = Number(piece.length);
    const width = Number(piece.width);
    const quantity = Number(piece.quantity);
    const thickness = Number(piece.thickness);
    if (!stock || !Number.isFinite(length) || !Number.isFinite(width) || !Number.isInteger(quantity) ||
        length <= 0 || width <= 0 || quantity <= 0 || !Number.isFinite(thickness) || thickness <= 0) continue;
    const stockLength = roundMm(stock.length);
    const stockWidth = roundMm(stock.width);
    if (stockLength <= 20 || stockWidth <= 20 || thickness !== Number(stock.thickness)) continue;
    if (!groups.has(stock.id)) {
      groups.set(stock.id, {
        stock,
        sheet: {
          name: stock.name,
          width: stockLength - trimMm * 2,
          height: stockWidth - trimMm * 2,
          kerf: kerfMm,
          cost: 0,
          // The optimizer needs a count of physical boards, not just one
          // representative board. Fractional stock remains represented by
          // separately registered remnants; it must not become a whole slab.
          quantity: Math.max(0, Math.floor(Number(stock.quantity) || 0))
        },
        demands: []
      });
    }
    const group = groups.get(stock.id);
    group.demands.push({
      name: piece.name?.trim() || 'Komad ' + (index + 1),
      width: roundMm(length),
      height: roundMm(width),
      quantity,
      // Stone grain and visual direction are preserved unless rotation is
      // explicitly enabled on a future per-piece control.
      can_rotate: piece.allowRotation === true
    });
  }
  return [...groups.values()].filter(group => group.demands.length);
}

export function summarizeCuttingPlan(layout, cutPlan) {
  return {
    sheetCount: Number(layout?.sheet_count || 0),
    placedCount: (layout?.layouts || []).reduce((sum, sheet) => sum + (sheet.placements || []).length, 0),
    unplaced: layout?.unplaced || [],
    wasteM2: Number(layout?.total_waste_area || 0) / 1000000,
    kerfM2: Number(layout?.total_kerf_area || 0) / 1000000,
    guillotine: Boolean(layout?.guillotine),
    sheets: (layout?.layouts || []).map((sheet, index) => ({
      ...sheet,
      plan: cutPlan?.sheet_plans?.[index] || null
    }))
  };
}


export function createSavedCuttingPlan(materials, createdAt = new Date().toISOString()) {
  if (!Array.isArray(materials) || !materials.length) return null;
  return {
    version: 1,
    createdAt,
    materials: materials.map(item => ({
      stockId: item.stockId,
      stockName: item.stockName,
      stockForm: item.stockForm || 'Ploča',
      summary: item.summary
    }))
  };
}

export function getSavedCuttingPlan(order) {
  const plan = order?.cuttingPlan;
  return plan?.version === 1 && Array.isArray(plan.materials) && plan.materials.length
    ? plan
    : null;
}
