const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function materialAreaM2(item) {
  const length = Number(item?.length);
  const width = Number(item?.width);
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return 0;
  return length * width / 10000;
}

export function calculateStockCarryingValue(item) {
  if (item?.pricePerM2 === null || item?.pricePerM2 === undefined || item?.pricePerM2 === '') return null;
  const price = Number(item.pricePerM2);
  const quantity = Number(item.quantity || 0);
  const area = materialAreaM2(item);
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 0 || area <= 0) return null;
  return roundMoney(area * quantity * price);
}

export function calculateMaterialReservation(stockItem, orderPieces = []) {
  const areaCm2 = (Array.isArray(orderPieces) ? orderPieces : []).reduce((sum, piece) =>
    sum + Math.max(0, Number(piece.length) || 0) * Math.max(0, Number(piece.width) || 0) * Math.max(0, Number(piece.quantity) || 0), 0);
  const stockAreaCm2 = materialAreaM2(stockItem) * 10000;
  if (!(stockAreaCm2 > 0) || !(areaCm2 > 0)) return 0;
  // When the cutting suggestion carries physical board keys, reserve the exact
  // number of distinct remnants used. Area alone cannot predict packing waste.
  if (stockItem.form === 'Ostatak') {
    const keyedPieces = (Array.isArray(orderPieces) ? orderPieces : []).filter(piece => Array.isArray(piece.remnantBoardKeys) && piece.remnantBoardKeys.length === Number(piece.quantity || 0));
    if (keyedPieces.length === (Array.isArray(orderPieces) ? orderPieces.length : 0) && keyedPieces.length) {
      return new Set(keyedPieces.flatMap(piece => piece.remnantBoardKeys)).size;
    }
    // Manual assignments without a geometric plan retain the conservative area estimate.
    return Math.ceil(areaCm2 / stockAreaCm2 - 1e-9);
  }
  // Full slabs retain the existing hundredth-slab reservation behavior.
  return Math.ceil((areaCm2 / stockAreaCm2) * 100 - 1e-9) / 100;
}
