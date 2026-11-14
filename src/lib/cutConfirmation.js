import { getOrderReservations, settleReservationForCut } from './workOrderStock.js';

const round = value => Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;

export function prepareCutConfirmation({ order, materials = [], materialId, remnants = [], operationId, actor = '', date = new Date().toISOString() }) {
  if (!order?.id || !materialId || !operationId) return { error: 'Nedostaju podaci radnog naloga ili oznaka pilanja.' };
  const savedPlan = order.cuttingPlan?.materials?.find(item => item.stockId === materialId);
  if (!savedPlan?.summary) return { error: 'Za odabrani materijal ne postoji spremljeni plan pilanja.' };
  const summary = savedPlan.summary;
  if (Array.isArray(summary.unplaced) && summary.unplaced.length) return { error: 'Nisu svi komadi raspoređeni na ploče. Prvo riješi nepostavljene komade.' };
  const usedSheets = Number(summary.sheetCount);
  if (!Number.isInteger(usedSheets) || usedSheets <= 0) return { error: 'Plan nema valjan broj ploča za potvrdu.' };
  const stock = materials.find(item => item.id === materialId);
  if (!stock || stock.archived) return { error: 'Izvorna ploča ili ostatak više nije dostupan u skladištu.' };
  if (order.cuttingConfirmations?.some(item => item.materialId === materialId)) return { error: 'Pilanje ovog materijala u nalogu već je potvrđeno.' };

  const reservations = getOrderReservations(order);
  const reservedQuantity = reservations.find(item => item.materialId === materialId)?.quantity || 0;
  const settlement = settleReservationForCut({
    order,
    materialId,
    usedQuantity: usedSheets,
    stockQuantity: Number(stock.quantity || 0)
  });
  if (settlement.error) return { error: settlement.error };

  const inputRemnants = Array.isArray(remnants) ? remnants : [];
  if (inputRemnants.length > 20) return { error: 'Možeš evidentirati najviše 20 ostataka u jednoj potvrdi.' };
  const cleanRemnants = [];
  for (const [index, item] of inputRemnants.entries()) {
    const length = Number(String(item.length ?? '').replace(',', '.'));
    const width = Number(String(item.width ?? '').replace(',', '.'));
    if (!Number.isFinite(length) || !Number.isFinite(width) || length < 20 || width < 20) {
      return { error: 'Svaki uporabni ostatak mora imati duljinu i širinu od najmanje 20 cm.' };
    }
    if (length > Number(stock.length) || width > Number(stock.width)) {
      return { error: 'Dimenzije ostatka ne mogu biti veće od izvorne ploče.' };
    }
    cleanRemnants.push({
      id: 'REM-' + operationId + '-' + (index + 1),
      name: 'Ostatak · ' + stock.name + ' · ' + order.id + ' · ' + (index + 1),
      type: stock.type,
      materialType: stock.materialType,
      form: 'Ostatak',
      length,
      width,
      thickness: Number(stock.thickness),
      quantity: 1,
      unit: 'kom',
      location: String(item.location || stock.location || ''),
      pricePerM2: stock.pricePerM2 ?? null,
      archived: false,
      parentMaterialId: stock.id,
      sourceOrderId: order.id,
      sourceCutOperationId: operationId,
      createdAt: date,
      note: String(item.note || '').slice(0,300)
    });
  }

  const nextMaterials = materials.map(item => item.id === materialId
    ? { ...item, quantity: settlement.stockAfter, updatedAt: date }
    : item).concat(cleanRemnants);
  const remainingReservations = settlement.remainingReservations;
  const nextOrder = {
    ...order,
    reservedMaterials: remainingReservations,
    reservedMaterialId: remainingReservations.length === 1 ? remainingReservations[0].materialId : null,
    reservedMaterialQty: remainingReservations.length === 1 ? remainingReservations[0].quantity : 0,
    cuttingConfirmations: [
      ...(order.cuttingConfirmations || []),
      {
        operationId,
        materialId,
        materialName: stock.name,
        sawName: savedPlan.sawName || null,
        usedSheets,
        reservedQuantity,
        consumedQuantity: usedSheets,
        returnedRemnants: cleanRemnants.map(item => ({ id: item.id, name: item.name, length: item.length, width: item.width, thickness: item.thickness })),
        wasteM2: round(Math.max(0, (Number(stock.length) * Number(stock.width) * usedSheets - (order.pieces || []).filter(piece => piece.materialId === materialId).reduce((sum,piece)=>sum+Number(piece.length||0)*Number(piece.width||0)*Number(piece.quantity||0),0) - cleanRemnants.reduce((sum,item)=>sum+item.length*item.width,0)) / 10000)),
        confirmedBy: String(actor || ''),
        confirmedAt: date
      }
    ]
  };
  const movements = [{
    id: operationId + ':consume',
    operationId,
    materialId,
    material: stock.name,
    kind: 'Potvrđeno pilanje - utrošak ploča',
    quantity: usedSheets,
    previousQuantity: Number(stock.quantity || 0),
    nextQuantity: settlement.stockAfter,
    orderId: order.id,
    location: stock.location || '',
    date: new Date(date).toLocaleDateString('hr-HR'),
    reason: 'Fizičko pilanje potvrđeno u proizvodnji'
  }, ...cleanRemnants.map(item => ({
    id: operationId + ':' + item.id,
    operationId,
    materialId: item.id,
    material: item.name,
    kind: 'Nastanak uporabnog ostatka nakon pilanja',
    quantity: 1,
    previousQuantity: 0,
    nextQuantity: 1,
    orderId: order.id,
    location: item.location,
    date: new Date(date).toLocaleDateString('hr-HR'),
    reason: 'Ostatak iz ploče ' + stock.name + ' (' + stock.id + ')'
  }))];
  return { order: nextOrder, materials: nextMaterials, movements, confirmation: nextOrder.cuttingConfirmations.at(-1), usedSheets, createdRemnants: cleanRemnants };
}
