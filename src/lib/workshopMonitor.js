import { PRODUCTION_STAGES, buildProductionUnits, blankPieceProductionRecord } from './production.js';

const COMPLETE = new Set(['Završeno', 'Nije potrebno']);
const ACTIVE_ORDER = order => !['Završen', 'Otkazan'].includes(order?.status);
const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function analyzeWorkshopCapacity(orders = [], production = {}) {
  const workers = [...new Set((Array.isArray(production.workers) ? production.workers : []).map(name => String(name || '').trim()).filter(Boolean))];
  const attendance = production?.attendance?.date === todayKey() ? (production.attendance.statuses || {}) : {};
  const deployment = production?.deployment?.date === todayKey() ? (production.deployment.assignments || {}) : {};
  const presentWorkers = workers.filter(name => attendance[name] === 'Prisutan');
  const absentWorkers = workers.filter(name => attendance[name] === 'Odsutan');
  const offShiftWorkers = workers.filter(name => attendance[name] === 'Izvan smjene');
  const unrecordedWorkers = workers.filter(name => !['Prisutan', 'Odsutan', 'Izvan smjene'].includes(attendance[name]));
  const fieldWorkers = presentWorkers
    .filter(name => deployment[name]?.area === 'Teren')
    .map(name => ({ name, task: String(deployment[name]?.task || '').trim(), location: String(deployment[name]?.location || '').trim() }));
  const fieldWorkerNames = new Set(fieldWorkers.map(worker => worker.name));
  const workshopWorkers = presentWorkers.filter(name => !fieldWorkerNames.has(name));
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
    const waitingItems = waiting.map(row => ({ orderId: row.unit.order.id, project: row.unit.order.project || '', customer: row.unit.order.customer || '', label: row.unit.label, unitIndex: row.unit.unitIndex }));
    return { stage: stageName, inProgress: inProgress.length, waiting: waiting.length, waitingItems, blockedByPrevious: blockedByPrevious.length, assigned: inProgress.map(row => row.stage.assignedTo).filter(Boolean) };
  });
  const idleWorkers = workshopWorkers.filter(name => !activeAssignments.has(name));
  const activeWorkshopWorkers = workshopWorkers.filter(name => activeAssignments.has(name));
  const manual = stages.find(item => item.stage === 'Ručna obrada');
  const workerSkills = production?.workerSkills || {};
  const recommendations = stages.flatMap(stage => {
    if (!stage.waiting) return [];
    const candidates = idleWorkers.filter(name => (workerSkills[name] || []).includes(stage.stage));
    if (!candidates.length) return [];
    return [{ stage: stage.stage, waiting: stage.waiting, workers: candidates, examples: stage.waitingItems.slice(0, 3) }];
  });
  const alerts = [];
  if (workers.length && unrecordedWorkers.length) alerts.push({
    id: 'attendance-unrecorded',
    severity: 'info',
    title: 'Prisutnost radnika nije evidentirana',
    description: `Za danas nije potvrđena prisutnost za ${unrecordedWorkers.length} od ${workers.length} evidentiranih radnika. Upozorenja o kapacitetu računaju samo potvrđeno prisutne.`,
    destination: 'Proizvodnja',
    workers: unrecordedWorkers.length
  });
  const incompleteFieldAssignments = fieldWorkers.filter(worker => !worker.task || !worker.location);
  if (incompleteFieldAssignments.length) alerts.push({
    id: 'field-assignment-incomplete',
    severity: 'info',
    title: 'Dopuni podatke terenskog posla',
    description: `Za ${incompleteFieldAssignments.map(worker => worker.name).join(', ')} upiši vrstu posla i lokaciju kako bi terenski raspored bio potpun.`,
    destination: 'Proizvodnja',
    workers: incompleteFieldAssignments.length
  });
  if (workshopWorkers.length && manual && manual.inProgress === 0) {
    alerts.push({
      id: 'manual-capacity-idle',
      severity: manual.waiting ? 'warning' : 'info',
      title: 'Ručna obrada nema aktivnog posla',
      description: (manual.waiting
        ? `Čeka ${manual.waiting} komada za ručnu obradu, a ${workshopWorkers.length} radnika je prisutno u radionici.`
        : `Nema komada spremnih za ručnu obradu; ${workshopWorkers.length} radnika je prisutno u radionici.`) + (fieldWorkers.length ? ` ${fieldWorkers.length} radnika je na terenu i nije uračunato.` : ''),
      destination: 'Proizvodnja',
      waiting: manual.waiting,
      workers: workshopWorkers.length
    });
  }
  stages.filter(item => item.waiting > 0 && item.stage !== 'Ručna obrada' && item.stage !== 'Terenski rad / montaža').forEach(item => alerts.push({
    id: 'stage-waiting-' + item.stage,
    severity: 'warning',
    title: 'Posao čeka fazu: ' + item.stage,
    description: item.waiting + ' komada spremno je za ovu fazu, ali još nije započeto.',
    destination: 'Proizvodnja',
    waiting: item.waiting
  }));
  return {
    workers, presentWorkers, absentWorkers, offShiftWorkers, unrecordedWorkers,
    workshopWorkers, fieldWorkers, idleWorkers, recommendations,
    activeWorkers: activeWorkshopWorkers.length,
    stages, alerts,
    summary: {
      activeOrders: (Array.isArray(orders) ? orders : []).filter(ACTIVE_ORDER).length,
      activePieces: units.length,
      inProgressStages: stages.reduce((sum, item) => sum + item.inProgress, 0),
      waitingPieces: stages.reduce((sum, item) => sum + item.waiting, 0),
      fieldWorkers: fieldWorkers.length,
      workshopWorkers: workshopWorkers.length
    }
  };
}
