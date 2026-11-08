const roundQuantity = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function getOrderReservations(order = {}) {
  const source = Array.isArray(order.reservedMaterials)
    ? order.reservedMaterials
    : Number(order.reservedMaterialQty || 0) > 0
      ? [{ materialId: order.reservedMaterialId, material: order.material, quantity: order.reservedMaterialQty }]
      : [];
  const grouped = new Map();
  for (const row of source) {
    const materialId = String(row?.materialId || '');
    const quantity = Number(row?.quantity || 0);
    if (!materialId || !Number.isFinite(quantity) || quantity <= 0) continue;
    const current = grouped.get(materialId) || { materialId, material: row.material || '', quantity: 0 };
    current.quantity = roundQuantity(current.quantity + quantity);
    grouped.set(materialId, current);
  }
  return [...grouped.values()];
}

export function getReservedQuantity(order, materialId) {
  return roundQuantity(getOrderReservations(order)
    .filter(row => row.materialId === materialId)
    .reduce((sum, row) => sum + row.quantity, 0));
}

/**
 * Settles the reservation for one material after a confirmed cut.
 * Stock quantities in this app exclude reserved stock. The reservation is
 * released once, then actual consumption is deducted from physical stock.
 */
export function settleReservationForCut({ order, materialId, usedQuantity, stockQuantity }) {
  const used = Number(usedQuantity);
  const stock = Number(stockQuantity);
  if (!materialId || !Number.isFinite(used) || used <= 0 || !Number.isFinite(stock) || stock < 0) {
    return { error: 'Nevaljani podaci za obračun potrošnje materijala.' };
  }
  const reservations = getOrderReservations(order);
  const reservedQuantity = getReservedQuantity(order, materialId);
  if (used > stock + reservedQuantity + 1e-9) {
    return { error: 'Nema dovoljno raspoloživog i rezerviranog materijala za ovu potrošnju.' };
  }
  const remainingReservations = reservations.filter(row => row.materialId !== materialId);
  const returnedQuantity = reservedQuantity;
  const stockAfter = roundQuantity(Math.max(0, stock + returnedQuantity - used));
  return {
    stockAfter,
    stockDelta: roundQuantity(returnedQuantity - used),
    consumedQuantity: roundQuantity(used),
    returnedQuantity,
    remainingReservations
  };
}

export function releaseOrderReservations({ order, materials = [] }) {
  const reservations = getOrderReservations(order);
  const missing = reservations.filter(reservation =>
    !materials.some(item => item.id === reservation.materialId));
  if (missing.length) {
    return { error: 'Jedan ili više rezerviranih materijala nije pronađen u skladištu.', missing };
  }
  const byMaterial = new Map();
  for (const reservation of reservations) {
    byMaterial.set(reservation.materialId,
      roundQuantity((byMaterial.get(reservation.materialId) || 0) + reservation.quantity));
  }
  const nextMaterials = materials.map(item => {
    const returned = byMaterial.get(item.id) || 0;
    return returned > 0
      ? { ...item, quantity: roundQuantity(Number(item.quantity || 0) + returned) }
      : item;
  });
  return { materials: nextMaterials, returned: reservations };
}
