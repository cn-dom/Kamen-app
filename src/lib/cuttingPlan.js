const roundMm = value => Math.round(Number(value) * 10);

export function buildCuttingPlanGroups(pieces = [], materials = []) {
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
          width: stockLength - 20,
          height: stockWidth - 20,
          kerf: 4,
          cost: 0,
          ...(stock.form === 'Ostatak' ? { quantity: Math.max(0, Math.floor(Number(stock.quantity) || 0)) } : {})
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
