import { PRODUCTION_STAGES, buildProductionUnits, blankPieceProductionRecord } from './production.js';

const COMPLETE = new Set(['Završeno', 'Nije potrebno']);
const ACTIVE_ORDER = order => !['Završen', 'Otkazan'].includes(order?.status);

export function analyzeWorkshopCapacity(orders = [], production = {}) {
  const workers = [...new Set((Array.isArray(production.workers) ? production.workers : []).map(name => String(name || '').trim()).filter(Boolean))];
  const units = buildProductionUnits(Array.isArray(orders) ? orders.filter(ACTIVE_ORDER) : []);
  const records = production?.pieces || {};
  const activeAssignments = new Map();
  const stages = PRODUCTION_STAGES.map((stageName, index) => {
    const rows = units.map(unit => {
      const record = records[unit.key] || blankPieceProductionRecord();
      const stage = record.stages?.[stageName] || {};
      const previousReady = PRODUCTION_STAGES.slice(0, index).every(previous => COMPLETE.has(record.stages?.[previous]?.status));
      return { unit, stage, previousReady };
    });
    const inProgress = rows.filter(row => row.stage.status === 'U tijeku');
    inProgress.forEach(({ stage }) => {
      const name = String(stage.assignedTo || '').trim();
      if (name) activeAssignments.set(name, (activeAssignments.get(name) || 0) + 1);
    });
    const waiting = rows.filter(row => row.previousReady && !COMPLETE.has(row.stage.status) && row.stage.status !== 'U tijeku');
    const blockedByPrevious = rows.filter(row => !row.previousReady && !COMPLETE.has(row.stage.status));
    return { stage: stageName, inProgress: inProgress.length, waiting: waiting.length, blockedByPrevious: blockedByPrevious.length, assigned: inProgress.map(row => row.stage.assignedTo).filter(Boolean) };
  });
  const idleWorkers = workers.filter(name => !activeAssignments.has(name));
  const manual = stages.find(item => item.stage === 'Ostala obrada');
  const alerts = [];
  if (workers.length && manual && manual.inProgress === 0) {
    alerts.push({
      id: 'manual-capacity-idle',
      severity: manual.waiting ? 'warning' : 'info',
      title: 'Ručna obrada nema aktivnog posla',
      description: manual.waiting
        ? `Čeka ${manual.waiting} komada za ručnu obradu, a ${workers.length} radnika je evidentirano.`
        : `Nema komada spremnih za ručnu obradu; ${workers.length} radnika je evidentirano.`,
      destination: 'Proizvodnja',
      waiting: manual.waiting,
      workers: workers.length
    });
  }
  stages.filter(item => item.waiting > 0 && item.stage !== 'Ostala obrada').forEach(item => alerts.push({
    id: 'stage-waiting-' + item.stage,
    severity: 'warning',
    title: 'Posao čeka fazu: ' + item.stage,
    description: item.waiting + ' komada spremno je za ovu fazu, ali još nije započeto.',
    destination: 'Proizvodnja',
    waiting: item.waiting
  }));
  return {
    workers,
    idleWorkers,
    activeWorkers: workers.length - idleWorkers.length,
    stages,
    alerts,
    summary: {
      activeOrders: (Array.isArray(orders) ? orders : []).filter(ACTIVE_ORDER).length,
      activePieces: units.length,
      inProgressStages: stages.reduce((sum, item) => sum + item.inProgress, 0),
      waitingPieces: stages.reduce((sum, item) => sum + item.waiting, 0)
    }
  };
}
