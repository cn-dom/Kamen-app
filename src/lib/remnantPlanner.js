const epsilon = 1e-7;

function tryPlace(rectangles, piece, kerf, allowRotation) {
  let best = null;
  for (const rect of rectangles) {
    const orientations = [{ w: piece.length + kerf, h: piece.width + kerf }];
    if (allowRotation && Math.abs(piece.length - piece.width) > epsilon) orientations.push({ w: piece.width + kerf, h: piece.length + kerf });
    for (const option of orientations) {
      if (option.w <= rect.w + epsilon && option.h <= rect.h + epsilon) {
        const score = Math.min(rect.w - option.w, rect.h - option.h) * 100000 + Math.max(rect.w - option.w, rect.h - option.h);
        if (!best || score < best.score) best = { rect, option, score };
      }
    }
  }
  if (!best) return false;
  const placed = { x: best.rect.x, y: best.rect.y, w: best.option.w, h: best.option.h };
  const next = [];
  for (const rect of rectangles) {
    const intersects = placed.x < rect.x + rect.w - epsilon && placed.x + placed.w > rect.x + epsilon && placed.y < rect.y + rect.h - epsilon && placed.y + placed.h > rect.y + epsilon;
    if (!intersects) { next.push(rect); continue; }
    const rightX = placed.x + placed.w;
    if (rect.x + rect.w - rightX > epsilon) next.push({ x: rightX, y: rect.y, w: rect.x + rect.w - rightX, h: rect.h });
    const bottomY = placed.y + placed.h;
    if (rect.y + rect.h - bottomY > epsilon) next.push({ x: rect.x, y: bottomY, w: placed.w, h: rect.y + rect.h - bottomY });
  }
  rectangles.splice(0, rectangles.length, ...next);
  return true;
}

/**
 * Distributes individual copies from an order line across compatible remnants.
 * A line may be split between several remnants; any copies that cannot be
 * placed remain assigned to the original slab/material.
 */
export function suggestRemnantAssignments(pieces = [], materials = [], { kerf = 0.4, trim = 1, allowRotation = true } = {}) {
  const sourceMaterials = Array.isArray(materials) ? materials : [];
  const stocks = sourceMaterials
    .filter(item => item.form === 'Ostatak' && !item.archived && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.length) > 2 * trim && Number(item.width) > 2 * trim)
    .map(item => ({ item, usedBoardKeys: new Set(), boards: Array.from({ length: Math.min(100, Number(item.quantity)) }, () => [{ x: 0, y: 0, w: Number(item.length) - trim * 2, h: Number(item.width) - trim * 2 }]) }))
    .sort((a, b) => Number(a.item.length) * Number(a.item.width) - Number(b.item.length) * Number(b.item.width));

  const candidates = (Array.isArray(pieces) ? pieces : []).map((piece, index) => ({ piece: { ...piece }, index, area: Number(piece.length) * Number(piece.width) * Number(piece.quantity || 0) }))
    .filter(entry => entry.piece.materialId && Number(entry.piece.length) > 0 && Number(entry.piece.width) > 0 && Number.isInteger(Number(entry.piece.quantity)) && Number(entry.piece.quantity) > 0)
    .sort((a, b) => b.area - a.area);

  const allocations = new Map();
  const assignedByLine = new Map();
  for (const entry of candidates) {
    const original = sourceMaterials.find(item => item.id === entry.piece.materialId);
    if (!original) continue;
    let remaining = Number(entry.piece.quantity);
    for (const stock of stocks) {
      if (remaining <= 0) break;
      if (stock.item.type !== original.type || Number(stock.item.thickness) !== Number(entry.piece.thickness || original.thickness)) continue;
      const trial = stock.boards.map(board => board.map(rect => ({ ...rect })));
      let placedCount = 0;
      for (let copy = 0; copy < remaining; copy++) {
        let placed = false;
        for (let boardIndex = 0; boardIndex < trial.length; boardIndex++) {
          if (tryPlace(trial[boardIndex], { length: Number(entry.piece.length), width: Number(entry.piece.width) }, kerf, allowRotation)) {
            stock.usedBoardKeys.add(stock.item.id + '::' + boardIndex);
            placed = true;
            break;
          }
        }
        if (!placed) break;
        placedCount += 1;
      }
      if (!placedCount) continue;
      stock.boards = trial;
      remaining -= placedCount;
      if (!assignedByLine.has(entry.index)) assignedByLine.set(entry.index, new Map());
      const lineAllocations = assignedByLine.get(entry.index);
      const allocation = lineAllocations.get(stock.item.id) || { quantity: 0, boardKeys: new Set() };
      allocation.quantity += placedCount;
      for (const key of stock.usedBoardKeys) allocation.boardKeys.add(key);
      lineAllocations.set(stock.item.id, allocation);
      allocations.set(stock.item.id, stock.item);
    }
    entry.remaining = remaining;
  }

  const piecesByIndex = new Map(candidates.map(entry => [entry.index, entry]));
  const result = [];
  const assignments = [];
  let assignedCount = 0;
  for (let index = 0; index < (Array.isArray(pieces) ? pieces.length : 0); index++) {
    const piece = pieces[index];
    const entry = piecesByIndex.get(index);
    const lineAllocations = assignedByLine.get(index);
    if (!entry || !lineAllocations?.size) {
      result.push({ ...piece });
      continue;
    }
    for (const [materialId, allocation] of lineAllocations) {
      const stock = allocations.get(materialId);
      const remnantBoardKeys = [...allocation.boardKeys];
      result.push({ ...piece, materialId, quantity: allocation.quantity, remnantBoardKeys });
      assignments.push({ pieceIndex: index, pieceName: piece.name, materialId, materialName: stock.name, form: 'Ostatak', quantity: allocation.quantity, reservedQuantity: remnantBoardKeys.length });
      assignedCount += allocation.quantity;
    }
    if (entry.remaining > 0) result.push({ ...piece, quantity: entry.remaining });
  }
  return { pieces: result, assignments, assignedCount, assignedLineCount: assignments.length };
}
