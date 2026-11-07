export const PRODUCTION_STAGES = ['Pilanje', 'Kanterica / obrada rubova', 'Poliranje', 'Ostala obrada'];
export const PRODUCTION_STAGE_STATUSES = ['Nije započeto', 'U tijeku', 'Zastoj', 'Završeno', 'Nije potrebno'];

export function blankStageRecord() {
  return { status: 'Nije započeto', assignedTo: '', startedAt: null, completedAt: null, sessions: [], blockedReason: '', note: '', history: [] };
}
export function blankPieceProductionRecord() {
  return {
    stages: Object.fromEntries(PRODUCTION_STAGES.map(stage => [stage, blankStageRecord()])),
    quality: { status: 'Čeka kontrolu', checkedBy: '', checkedAt: null, note: '', history: [] },
    updatedAt: null
  };
}
export function buildProductionUnits(orders, materials = []) {
  return (Array.isArray(orders) ? orders : []).flatMap(order =>
    (Array.isArray(order.pieces) ? order.pieces : []).flatMap((piece, pieceIndex) => {
      const quantity = Math.max(0, Math.min(1000, Math.floor(Number(piece.quantity) || 0)));
      return Array.from({ length: quantity }, (_, unitIndex) => ({
        key: order.id + '::' + pieceIndex + '::' + (unitIndex + 1),
        order, piece, pieceIndex, unitIndex: unitIndex + 1,
        label: piece.name || 'Komad ' + (pieceIndex + 1),
        material: piece.material || materials.find(item => item.id === piece.materialId)?.name || order.materialAllocations?.find(allocation => allocation.materialId === piece.materialId)?.material || order.material || '—'
      }));
    })
  );
}
export function normalizeProductionRecords(raw, orders) {
  if (raw && raw.version === 2 && raw.pieces && typeof raw.pieces === 'object') return raw;
  const pieces = {};
  buildProductionUnits(orders).forEach(row => {
    const legacy = raw?.[row.order.id] || {};
    const record = blankPieceProductionRecord();
    PRODUCTION_STAGES.forEach(stage => {
      const oldStatus = legacy[stage];
      if (PRODUCTION_STAGE_STATUSES.includes(oldStatus)) record.stages[stage].status = oldStatus;
    });
    if (legacy['Završna kontrola'] === 'Završeno') {
      record.quality.status = 'Prošlo';
      record.quality.checkedAt = legacy.updatedAt || null;
    }
    record.updatedAt = legacy.updatedAt || null;
    pieces[row.key] = record;
  });
  return { version: 2, pieces, workers: [], migratedAt: new Date().toISOString(), legacyRecordsPreserved: raw || {} };
}
export function calculateStageElapsedMs(stage, now = Date.now()) {
  const sessions = Array.isArray(stage?.sessions) ? stage.sessions : [];
  return sessions.reduce((sum, session) => {
    if (!session.startedAt) return sum;
    return sum + Math.max(0, (session.endedAt ? new Date(session.endedAt).getTime() : now) - new Date(session.startedAt).getTime());
  }, 0);
}
export function formatProductionDuration(ms) {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? hours + ' h ' + rest + ' min' : minutes + ' min';
}
export function calculatePieceProgress(record) {
  const complete = PRODUCTION_STAGES.filter(stage => ['Završeno', 'Nije potrebno'].includes(record?.stages?.[stage]?.status)).length;
  return Math.round(complete / PRODUCTION_STAGES.length * 100);
}
