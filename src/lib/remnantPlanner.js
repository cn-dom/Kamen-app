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
 * Assigns complete order lines to compatible remnants where every copy fits.
 * Lines that do not fit remain assigned to their original material.
 */
export function suggestRemnantAssignments(pieces = [], materials = [], { kerf = 0.4, trim = 1, allowRotation = true } = {}) {
  const result = pieces.map(piece => ({ ...piece }));
  const stocks = (Array.isArray(materials) ? materials : [])
    .filter(item => item.form === 'Ostatak' && !item.archived && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.length) > 2 * trim && Number(item.width) > 2 * trim)
    .map(item => ({ item, boards: Array.from({ length: Math.min(100, Number(item.quantity)) }, () => [{ x: 0, y: 0, w: Number(item.length) - trim * 2, h: Number(item.width) - trim * 2 }]) }))
    .sort((a, b) => Number(a.item.length) * Number(a.item.width) - Number(b.item.length) * Number(b.item.width));
  const candidates = result.map((piece, index) => ({ piece, index, area: Number(piece.length) * Number(piece.width) * Number(piece.quantity || 0) }))
    .filter(entry => entry.piece.materialId && Number(entry.piece.length) > 0 && Number(entry.piece.width) > 0 && Number.isInteger(Number(entry.piece.quantity)) && Number(entry.piece.quantity) > 0)
    .sort((a, b) => b.area - a.area);
  const assignments = [];
  for (const entry of candidates) {
    const original = materials.find(item => item.id === entry.piece.materialId);
    if (!original) continue;
    for (const stock of stocks) {
      if (stock.item.type !== original.type || Number(stock.item.thickness) !== Number(entry.piece.thickness || original.thickness)) continue;
      const trial = stock.boards.map(board => board.map(rect => ({ ...rect })));
      let placed = true;
      for (let copy = 0; copy < Number(entry.piece.quantity); copy++) {
        let done = false;
        for (const board of trial) {
          if (tryPlace(board, { length: Number(entry.piece.length), width: Number(entry.piece.width) }, kerf, allowRotation)) { done = true; break; }
        }
        if (!done) { placed = false; break; }
      }
      if (placed) {
        stock.boards = trial;
        result[entry.index] = { ...entry.piece, materialId: stock.item.id };
        assignments.push({ pieceIndex: entry.index, pieceName: entry.piece.name, materialId: stock.item.id, materialName: stock.item.name, form: 'Ostatak' });
        break;
      }
    }
  }
  return { pieces: result, assignments, assignedCount: assignments.length };
}
