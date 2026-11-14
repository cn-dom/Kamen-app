import { applyPieceProductionRouting } from './operationsRouting.js';
export const PRODUCTION_STAGES = [
  'Pilanje',
  'Kanterica / obrada rubova',
  'Poliranje šmusa i okapnica',
  'Ravno poliranje',
  'Ručna obrada',
  'Terenski rad / montaža'
];
export const PRODUCTION_STAGE_STATUSES = ['Nije započeto', 'U tijeku', 'Zastoj', 'Završeno', 'Nije potrebno'];

export function blankStageRecord() {
  return { status: 'Nije započeto', assignedTo: '', startedAt: null, completedAt: null, sessions: [], downtime: [], blockedReason: '', note: '', history: [] };
}
export function blankPieceProductionRecord(piece = null) {
  const record = {
    stages: Object.fromEntries(PRODUCTION_STAGES.map(stage => [stage, blankStageRecord()])),
    quality: { status: 'Čeka kontrolu', checkedBy: '', checkedAt: null, note: '', history: [] },
    updatedAt: null
  };
  return piece ? applyPieceProductionRouting(record, piece) : record;
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
const legacyOtherStage = (oldStage, isField = false) => {
  const stage = oldStage && typeof oldStage === 'object' ? oldStage : blankStageRecord();
  return {
    ...blankStageRecord(),
    ...stage,
    status: stage.status || (isField ? 'Nije potrebno' : 'Nije započeto'),
    sessions: Array.isArray(stage.sessions) ? stage.sessions : [],
    downtime: Array.isArray(stage.downtime) ? stage.downtime : [],
    history: Array.isArray(stage.history) ? stage.history : []
  };
};
export function normalizeProductionRecords(raw, orders) {
  if (raw && raw.version === 4 && raw.pieces && typeof raw.pieces === 'object' && buildProductionUnits(orders).every(row => raw.pieces[row.key]?.routing)) return raw;
  if (raw && raw.version === 4 && raw.pieces && typeof raw.pieces === 'object') {
    const pieces = { ...raw.pieces };
    buildProductionUnits(orders).forEach(row => {
      const existing = pieces[row.key] || blankPieceProductionRecord(row.piece);
      pieces[row.key] = applyPieceProductionRouting(existing, row.piece);
    });
    return { ...raw, pieces };
  }
  if (raw && raw.version === 3 && raw.pieces && typeof raw.pieces === 'object') {
    const pieces = Object.fromEntries(Object.entries(raw.pieces).map(([key, oldRecord]) => {
      const oldStages = oldRecord?.stages || {};
      const oldPolishing = oldStages['Poliranje'] || blankStageRecord();
      const wasFlatPolishing = oldPolishing.workCenter === 'Vanjska polirka za ravne spomenike i obloge';
      const edgePolishing = wasFlatPolishing ? { ...blankStageRecord(), status: 'Nije potrebno' } : { ...blankStageRecord(), ...oldPolishing };
      const flatPolishing = wasFlatPolishing ? { ...blankStageRecord(), ...oldPolishing } : { ...blankStageRecord(), status: 'Nije potrebno' };
      return [key, { ...oldRecord, stages: {
        ...oldStages,
        'Poliranje': undefined,
        'Poliranje šmusa i okapnica': edgePolishing,
        'Ravno poliranje': flatPolishing
      }}];
    }));
    const workerSkills = Object.fromEntries(Object.entries(raw.workerSkills || {}).map(([worker, skills]) => [worker, (Array.isArray(skills) ? skills : []).flatMap(skill => skill === 'Poliranje' ? ['Poliranje šmusa i okapnica', 'Ravno poliranje'] : [skill])]));
    buildProductionUnits(orders).forEach(row => {
      if (pieces[row.key]) pieces[row.key] = applyPieceProductionRouting(pieces[row.key], row.piece);
    });
    return { ...raw, version: 4, pieces, workerSkills, migratedAt: new Date().toISOString() };
  }
  const pieces = {};
  buildProductionUnits(orders).forEach(row => {
    const record = blankPieceProductionRecord(row.piece);
    const oldRecord = raw?.pieces?.[row.key] || null;
    if (oldRecord?.stages) {
      const oldOther = oldRecord.stages['Ostala obrada'];
      const fieldWasSelected = oldOther?.workCenter === 'Terenski rad / montaža grobnica';
      const manualStage = fieldWasSelected ? { ...blankStageRecord(), status: 'Nije potrebno' } : legacyOtherStage(oldOther);
      const fieldStage = fieldWasSelected
        ? legacyOtherStage(oldOther, true)
        : { ...blankStageRecord(), status: 'Nije potrebno' };
      record.stages = {
        ...record.stages,
        ...Object.fromEntries(PRODUCTION_STAGES.filter(stage => stage !== 'Ručna obrada' && stage !== 'Terenski rad / montaža')
          .map(stage => [stage, { ...blankStageRecord(), ...(oldRecord.stages[stage] || {}) }])),
        'Ručna obrada': manualStage,
        'Terenski rad / montaža': fieldStage
      };
      record.quality = { ...record.quality, ...(oldRecord.quality || {}) };
      record.updatedAt = oldRecord.updatedAt || null;
      record.legacyStages = { ...(oldRecord.legacyStages || {}), ...(oldOther ? { 'Ostala obrada': oldOther } : {}) };
    } else {
      const legacy = raw?.[row.order.id] || {};
      PRODUCTION_STAGES.slice(0, 3).forEach(stage => {
        const oldStatus = legacy[stage] ?? (stage === 'Poliranje šmusa i okapnica' ? legacy['Poliranje'] : undefined);
        if (PRODUCTION_STAGE_STATUSES.includes(oldStatus)) record.stages[stage].status = oldStatus;
      });
      if (PRODUCTION_STAGE_STATUSES.includes(legacy['Ostala obrada'])) record.stages['Ručna obrada'].status = legacy['Ostala obrada'];
      record.stages['Terenski rad / montaža'].status = 'Nije potrebno';
      if (legacy['Završna kontrola'] === 'Završeno') {
        record.quality.status = 'Prošlo';
        record.quality.checkedAt = legacy.updatedAt || null;
      }
      record.updatedAt = legacy.updatedAt || null;
    }
    pieces[row.key] = record;
  });
  buildProductionUnits(orders).forEach(row => {
    if (pieces[row.key]) pieces[row.key] = applyPieceProductionRouting(pieces[row.key], row.piece);
  });
  return {
    version: 4,
    pieces,
    workers: Array.isArray(raw?.workers) ? raw.workers : [],
    ...(raw?.attendance ? { attendance: raw.attendance } : {}),
    ...(raw?.deployment ? { deployment: raw.deployment } : {}),
    ...(raw?.workerSkills ? { workerSkills: Object.fromEntries(Object.entries(raw.workerSkills).map(([worker, skills]) => [worker, (Array.isArray(skills) ? skills : []).map(skill => skill === 'Ostala obrada' ? 'Ručna obrada' : skill)])) } : {}),
    migratedAt: new Date().toISOString(),
    legacyRecordsPreserved: raw || {}
  };
}

export function startProductionStage(stage, timestamp = new Date().toISOString()) {
  const previous = stage || blankStageRecord();
  const downtime = [...(previous.downtime || [])];
  for (let index = downtime.length - 1; index >= 0; index -= 1) {
    if (!downtime[index].endedAt) { downtime[index] = { ...downtime[index], endedAt: timestamp }; break; }
  }
  return {
    ...previous,
    status: 'U tijeku',
    startedAt: previous.startedAt || timestamp,
    completedAt: null,
    blockedReason: '',
    downtime,
    sessions: [...(previous.sessions || []), { startedAt: timestamp, endedAt: null }]
  };
}
export function pauseProductionStage(stage, timestamp = new Date().toISOString(), reason = '') {
  const previous = stage || blankStageRecord();
  if (previous.status !== 'U tijeku') return previous;
  const sessions = [...(previous.sessions || [])];
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (!sessions[index].endedAt) { sessions[index] = { ...sessions[index], endedAt: timestamp }; break; }
  }
  return {
    ...previous,
    status: 'Zastoj',
    blockedReason: String(reason || '').trim(),
    sessions,
    downtime: [...(previous.downtime || []), { startedAt: timestamp, endedAt: null, reason: String(reason || '').trim() }]
  };
}
export function finishProductionStage(stage, timestamp = new Date().toISOString()) {
  const previous = stage || blankStageRecord();
  const sessions = [...(previous.sessions || [])];
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (!sessions[index].endedAt) { sessions[index] = { ...sessions[index], endedAt: timestamp }; break; }
  }
  const downtime = [...(previous.downtime || [])];
  for (let index = downtime.length - 1; index >= 0; index -= 1) {
    if (!downtime[index].endedAt) { downtime[index] = { ...downtime[index], endedAt: timestamp }; break; }
  }
  return { ...previous, status: 'Završeno', completedAt: timestamp, blockedReason: '', sessions, downtime };
}
export function resetProductionStage(stage, timestamp = new Date().toISOString(), reason = 'Ponovno otvoreno zbog dorade') {
  const previous = stage || blankStageRecord();
  const sessions = [...(previous.sessions || [])];
  const downtime = [...(previous.downtime || [])];
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (!sessions[index].endedAt) { sessions[index] = { ...sessions[index], endedAt: timestamp }; break; }
  }
  for (let index = downtime.length - 1; index >= 0; index -= 1) {
    if (!downtime[index].endedAt) { downtime[index] = { ...downtime[index], endedAt: timestamp }; break; }
  }
  return {
    ...previous,
    status: 'Nije započeto',
    completedAt: null,
    blockedReason: '',
    sessions,
    downtime,
    history: [...(previous.history || []), { from: previous.status, to: 'Nije započeto', at: timestamp, reason }]
  };
}
export function calculateStageDowntimeMs(stage, now = Date.now()) {
  return (Array.isArray(stage?.downtime) ? stage.downtime : []).reduce((sum, interval) => {
    if (!interval.startedAt) return sum;
    const start = new Date(interval.startedAt).getTime();
    const end = interval.endedAt ? new Date(interval.endedAt).getTime() : now;
    return sum + (Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0);
  }, 0);
}
export function calculateStageElapsedMs(stage, now = Date.now()) {
  const sessions = Array.isArray(stage?.sessions) ? stage.sessions : [];
  return sessions.reduce((sum, session) => {
    if (!session.startedAt) return sum;
    const start = new Date(session.startedAt).getTime();
    const end = session.endedAt ? new Date(session.endedAt).getTime() : now;
    return sum + (Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0);
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
export function isProductionOrderComplete(order, productionRecords) {
  const units = buildProductionUnits(order ? [order] : []);
  if (!units.length) return false;
  return units.every(row => {
    const record = productionRecords?.pieces?.[row.key];
    return Boolean(record) &&
      PRODUCTION_STAGES.every(stage => ['Završeno', 'Nije potrebno'].includes(record.stages?.[stage]?.status)) &&
      record.quality?.status === 'Prošlo';
  });
}
export const PRODUCTION_WORK_CENTERS = {
  'Pilanje': ['Pila 1', 'Pila 2'],
  'Kanterica / obrada rubova': ['Kanterica · obline'],
  'Poliranje šmusa i okapnica': ['Polirka za šmuse i okapnice'],
  'Poliranje': ['Polirka za šmuse i okapnice'],
  'Ravno poliranje': ['Vanjska polirka za ravne spomenike i obloge'],
  'Ručna obrada': ['Ručna obrada'],
  'Terenski rad / montaža': ['Terenski rad / montaža grobnica']
};
export function isValidProductionWorkCenter(stageName, workCenter) {
  const options = PRODUCTION_WORK_CENTERS[stageName];
  if (!options) return true;
  return options.includes(String(workCenter || '').trim());
}
export function workerCanPerformProductionStage(stageName, skills) {
  if (!Array.isArray(skills) || !skills.length) return true;
  const accepted = stageName === 'Terenski rad / montaža'
    ? ['Terenski rad / montaža', 'Montaža']
    : stageName === 'Poliranje šmusa i okapnica'
      ? ['Poliranje šmusa i okapnica', 'Poliranje']
      : stageName === 'Ravno poliranje'
        ? ['Ravno poliranje', 'Poliranje']
        : stageName === 'Ručna obrada'
      ? ['Ručna obrada', 'Ostala obrada']
      : [stageName];
  return accepted.some(skill => skills.includes(skill));
}
