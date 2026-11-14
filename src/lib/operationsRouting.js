export const PIECE_PRODUCT_TYPES = ['Spomenik', 'Klupica', 'Poklopnica', 'Postolje', 'Obloga', 'Stepenica', 'Gazište', 'Čelo stepenice', 'Vaza', 'Svijećnjak', 'Ostalo'];
export const PIECE_OPTIONAL_OPERATIONS = [
  { id: 'edge-polish', label: 'Poliranje šmusa i okapnica', stage: 'Poliranje šmusa i okapnica' },
  { id: 'flat-polish', label: 'Ravno poliranje', stage: 'Ravno poliranje' },
  { id: 'manual', label: 'Ručna obrada', stage: 'Ručna obrada' },
  { id: 'field', label: 'Terenski rad / montaža', stage: 'Terenski rad / montaža' }
];

export function getPieceProductionRouting(piece = {}) {
  const type = piece.productType || 'Ostalo';
  const processing = piece.processing || piece;
  const requiredStages = new Set(['Pilanje']);
  const operations = [];
  if (type === 'Spomenik') {
    if ((processing.monumentShape || piece.monumentShape) === 'obline') requiredStages.add('Kanterica / obrada rubova');
    if ((processing.monumentShape || piece.monumentShape) === 'ravno') requiredStages.add('Ravno poliranje');
    if (processing.dripEdge ?? piece.dripEdge) requiredStages.add('Poliranje šmusa i okapnica');
    if (processing.includesFan ?? piece.includesFan) {
      requiredStages.add('Ručna obrada');
      operations.push('Ručna obrada lepeze');
    }
  }
  if (type === 'Poklopnica') {
    const heads = processing.headGrinding || piece.headGrinding || 'none';
    if (heads !== 'none') {
      requiredStages.add('Ručna obrada');
      operations.push(heads === 'both' ? 'Brušenje obje glave poklopnice' : heads === 'left' ? 'Brušenje lijeve glave poklopnice' : 'Brušenje desne glave poklopnice');
    }
  }
  const selected = Array.isArray(processing.customOperations) ? processing.customOperations : [];
  PIECE_OPTIONAL_OPERATIONS.filter(option => selected.includes(option.id)).forEach(option => {
    requiredStages.add(option.stage);
    operations.push(option.label);
  });
  return {
    requiredStages: [...requiredStages],
    operations,
    productType: type,
    model: String(piece.model || '').trim(),
    details: type === 'Klupica'
      ? (processing.benchUse || piece.benchUse || 'vanjska') === 'unutarnja' ? 'Unutarnja klupica' : 'Vanjska klupica'
      : ''
  };
}

export function applyPieceProductionRouting(record, piece) {
  const routing = getPieceProductionRouting(piece);
  const stages = { ...(record?.stages || {}) };
  const required = new Set(routing.requiredStages);
  Object.keys(stages).forEach(stage => {
    if (!required.has(stage) && (!stages[stage] || stages[stage].status === 'Nije započeto')) {
      stages[stage] = { ...(stages[stage] || {}), status: 'Nije potrebno' };
    } else if (required.has(stage) && stages[stage]?.status === 'Nije potrebno') {
      stages[stage] = { ...stages[stage], status: 'Nije započeto' };
    }
  });
  return { ...record, stages, routing };
}
