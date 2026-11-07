const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function createMaterialConsumptionRecord({ id, orderId, materialId, materialName, usedQuantity, boardLengthCm, boardWidthCm, pricePerM2, date = new Date().toISOString() }) {
  const used = Number(usedQuantity);
  const length = Number(boardLengthCm);
  const width = Number(boardWidthCm);
  const price = pricePerM2 === null || pricePerM2 === undefined || pricePerM2 === '' ? null : Number(pricePerM2);
  if (!id || !orderId || !materialId || !Number.isFinite(used) || used <= 0 || !Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
    throw new Error('Nedostaju valjani podaci o potrošnji materijala.');
  }
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Nabavna cijena po m² nije valjana.');
  const boardAreaM2 = Math.round((length * width / 10000) * 10000) / 10000;
  const consumedAreaM2 = Math.round(boardAreaM2 * used * 10000) / 10000;
  return {
    id, orderId, materialId, materialName: String(materialName || 'Materijal'),
    usedQuantity: used, boardAreaM2, consumedAreaM2,
    pricePerM2: price, materialCost: price === null ? null : roundMoney(consumedAreaM2 * price),
    priceKnown: price !== null, source: 'Pilanje', date
  };
}

export function summarizeMaterialConsumption(records = [], orderId) {
  const related = (Array.isArray(records) ? records : []).filter(record => record.orderId === orderId);
  const priced = related.filter(record => record.priceKnown === true && Number.isFinite(Number(record.materialCost)));
  const unpriced = related.filter(record => record.priceKnown !== true || record.materialCost === null || record.materialCost === undefined);
  return {
    recordCount: related.length,
    pricedRecordCount: priced.length,
    unpricedRecordCount: unpriced.length,
    usedQuantity: Math.round(related.reduce((sum, record) => sum + Number(record.usedQuantity || 0),  0) * 100) / 100,
    consumedAreaM2: Math.round(related.reduce((sum, record) => sum + Number(record.consumedAreaM2 || 0), 0) * 10000) / 10000,
    materialCost: roundMoney(priced.reduce((sum, record) => sum + Number(record.materialCost || 0), 0)),
    materials: [...new Set(related.map(record => record.materialName).filter(Boolean))]
  };
}
