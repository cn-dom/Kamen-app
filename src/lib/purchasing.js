export function calculatePurchaseLine(item = {}) {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
  const vatRate = Math.min(100, Math.max(0, Number(item.vatRate) || 0));
  const net = Math.round(quantity * unitPrice * 100) / 100;
  const vat = Math.round(net * vatRate) / 100;
  return { net, vat, gross: Math.round((net + vat) * 100) / 100 };
}

export function purchaseOrderTotals(items = []) {
  return (Array.isArray(items) ? items : []).reduce((total, item) => {
    const line = calculatePurchaseLine(item);
    return { net: total.net + line.net, vat: total.vat + line.vat, gross: total.gross + line.gross };
  }, { net: 0, vat: 0, gross: 0 });
}

export function materialCostPerM2(item = {}) {
  const unit = String(item.unit || '').toLocaleLowerCase('hr');
  const price = Math.max(0, Number(item.unitPrice) || 0);
  if (unit === 'm²' || unit === 'm2') return Math.round(price * 100) / 100;
  const area = Number(item.length) * Number(item.width) / 10000;
  if (area > 0 && (unit === 'ploča' || unit === 'kom')) return Math.round((price / area) * 100) / 100;
  return null;
}

export function receivePurchaseLine(item = {}, received) {
  const amount = Number(received);
  const ordered = Number(item.orderedQty) || 0;
  const already = Number(item.receivedQty) || 0;
  if (!Number.isFinite(amount) || amount < 0 || amount > ordered - already + 1e-9) {
    throw new RangeError('Zaprimljena količina nije valjana ili prelazi preostalu narudžbu.');
  }
  return { ...item, receivedQty: Math.round((already + amount) * 10000) / 10000 };
}


/**
 * Returns active stock items at or below their configured minimum.
 * Suggested order quantity restores the stock to twice the minimum level.
 */
export function lowStockSuggestions(materials = []) {
  if (!Array.isArray(materials)) return [];
  return materials
    .filter(item => !item.archived && item.form !== 'Otpad' && Number(item.min) > 0 && Number(item.quantity || 0) <= Number(item.min))
    .map(item => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const minimum = Math.max(0, Number(item.min) || 0);
      return {
        ...item,
        currentQuantity: quantity,
        minimumQuantity: minimum,
        shortage: Math.round(Math.max(0, minimum - quantity) * 100) / 100,
        suggestedQuantity: Math.round(Math.max(0, minimum * 2 - quantity) * 100) / 100
      };
    })
    .sort((a, b) => (a.currentQuantity / a.minimumQuantity) - (b.currentQuantity / b.minimumQuantity));
}
