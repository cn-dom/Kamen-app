const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const roundArea = value => Math.round(Number(value) * 10000) / 10000;

export function createMaterialOutputId(operationId, index) {
  const operation = String(operationId || '').trim();
  const position = Number(index);
  if (!operation || !Number.isInteger(position) || position < 0) {
    throw new Error('Za izlazni materijal nedostaje valjana oznaka operacije ili redni broj.');
  }
  return 'MAT-' + operation + '-' + (position + 1);
}

export function createMaterialConsumptionRecord({ id, orderId, materialId, materialName, usedQuantity, boardLengthCm, boardWidthCm, pricePerM2, outputs = [], date = new Date().toISOString() }) {
  const used = Number(usedQuantity);
  const length = Number(boardLengthCm);
  const width = Number(boardWidthCm);
  const price = pricePerM2 === null || pricePerM2 === undefined || pricePerM2 === '' ? null : Number(pricePerM2);
  if (!id || !orderId || !materialId || !Number.isFinite(used) || used <= 0 || !Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
    throw new Error('Nedostaju valjani podaci o potrošnji materijala.');
  }
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Nabavna cijena po m² nije valjana.');
  if (!Array.isArray(outputs)) throw new Error('Izlazne stavke pilanja nisu valjane.');
  const boardAreaM2 = roundArea(length * width / 10000);
  const consumedAreaM2 = roundArea(boardAreaM2 * used);
  const outputRows = outputs.map(output => {
    const quantity = Number(output.quantity || 0);
    const outputLength = Number(output.length || 0);
    const outputWidth = Number(output.width || 0);
    const areaM2 = roundArea(outputLength * outputWidth / 10000 * quantity);
    const type = output.form === 'Ostatak' ? 'Ostatak' : output.form === 'Otpad' ? 'Otpad' : 'Gotov komad';
    return { id: output.id, name: String(output.name || 'Izlazna stavka'), type, quantity, lengthCm: outputLength, widthCm: outputWidth, areaM2, value: price === null ? null : roundMoney(areaM2 * price), location: output.location || '', parentMaterialId: output.parentMaterialId || materialId, originMaterialId: output.originMaterialId || output.sourceMaterialId || materialId, sourceCutOperationId: output.sourceCutOperationId || id, orderId: output.orderId || orderId };
  });
  const sumType = type => roundArea(outputRows.filter(row => row.type === type).reduce((sum, row) => sum + row.areaM2, 0));
  const finishedAreaM2 = sumType('Gotov komad');
  const remnantAreaM2 = sumType('Ostatak');
  const wasteAreaM2 = sumType('Otpad');
  const recordedOutputAreaM2 = roundArea(finishedAreaM2 + remnantAreaM2 + wasteAreaM2);
  if (recordedOutputAreaM2 > consumedAreaM2 + 0.0001) throw new Error('Zbroj površina izlaznih komada, ostataka i otpada veći je od potrošene površine ploča. Provjeri dimenzije i količine.');
  const processLossAreaM2 = roundArea(Math.max(0, consumedAreaM2 - recordedOutputAreaM2));
  const materialCost = price === null ? null : roundMoney(consumedAreaM2 * price);
  const remnantValue = price === null ? null : roundMoney(remnantAreaM2 * price);
  const wasteCost = price === null ? null : roundMoney((wasteAreaM2 + processLossAreaM2) * price);
  const jobMaterialCost = price === null ? null : roundMoney(materialCost - remnantValue);
  const percentage = area => consumedAreaM2 > 0 ? Math.round(area / consumedAreaM2 * 10000) / 100 : 0;
  return {
    id, orderId, materialId, materialName: String(materialName || 'Materijal'),
    usedQuantity: used, boardLengthCm: length, boardWidthCm: width, boardAreaM2, consumedAreaM2,
    pricePerM2: price, materialCost, priceKnown: price !== null,
    finishedAreaM2, remnantAreaM2, wasteAreaM2, processLossAreaM2, recordedOutputAreaM2,
    finishedYieldPercent: percentage(finishedAreaM2),
    reusableYieldPercent: percentage(finishedAreaM2 + remnantAreaM2),
    wastePercent: percentage(wasteAreaM2 + processLossAreaM2),
    remnantValue, wasteCost, jobMaterialCost, outputs: outputRows,
    source: 'Pilanje', date
  };
}

export function summarizeMaterialConsumption(records = [], orderId) {
  const related = (Array.isArray(records) ? records : []).filter(record => record.orderId === orderId);
  const priced = related.filter(record => record.priceKnown === true && Number.isFinite(Number(record.materialCost)));
  const unpriced = related.filter(record => record.priceKnown !== true || record.materialCost === null || record.materialCost === undefined);
  return {
    recordCount: related.length, pricedRecordCount: priced.length, unpricedRecordCount: unpriced.length,
    usedQuantity: Math.round(related.reduce((sum, record) => sum + Number(record.usedQuantity || 0), 0) * 100) / 100,
    consumedAreaM2: roundArea(related.reduce((sum, record) => sum + Number(record.consumedAreaM2 || 0), 0)),
    finishedAreaM2: roundArea(related.reduce((sum, record) => sum + Number(record.finishedAreaM2 || 0), 0)),
    remnantAreaM2: roundArea(related.reduce((sum, record) => sum + Number(record.remnantAreaM2 || 0), 0)),
    wasteAreaM2: roundArea(related.reduce((sum, record) => sum + Number(record.wasteAreaM2 || 0), 0)),
    processLossAreaM2: roundArea(related.reduce((sum, record) => sum + Number(record.processLossAreaM2 || 0), 0)),
    remnantValue: roundMoney(priced.reduce((sum, record) => sum + Number(record.remnantValue || 0), 0)),
    wasteCost: roundMoney(priced.reduce((sum, record) => sum + Number(record.wasteCost || 0), 0)),
    jobMaterialCost: roundMoney(priced.reduce((sum, record) => sum + Number(record.jobMaterialCost ?? record.materialCost ?? 0), 0)),
    materialCost: roundMoney(priced.reduce((sum, record) => sum + Number(record.materialCost || 0), 0)),
    materials: [...new Set(related.map(record => record.materialName).filter(Boolean))]
  };
}
