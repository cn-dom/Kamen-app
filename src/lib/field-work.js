export const FIELD_WORK_TERMINAL_STATUSES = new Set(['Završeno', 'Vraćeno', 'Otkazano']);

export function normalizeFieldCrew(job = {}) {
  const source = Array.isArray(job.crew) ? job.crew : String(job.team || '').split(/[,;\n]/);
  return [...new Set(source.map(value => String(value || '').trim()).filter(Boolean))];
}

export function fieldJobInterval(job = {}) {
  const date = String(job.date || '').slice(0, 10);
  if (!date) return null;
  const start = String(job.startTime || '08:00');
  const end = String(job.endTime || '16:00');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return null;
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
  const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
  if (endMinutes <= startMinutes) return null;
  return { date, startMinutes, endMinutes };
}

export function findFieldCrewConflicts(jobs = [], candidate = {}, ignoreId = null) {
  const interval = fieldJobInterval(candidate);
  if (!interval) return [];
  const crew = new Set(normalizeFieldCrew(candidate));
  if (!crew.size) return [];
  return jobs.filter(job => {
    if (!job || job.id === ignoreId || FIELD_WORK_TERMINAL_STATUSES.has(job.status)) return false;
    const other = fieldJobInterval(job);
    if (!other || other.date !== interval.date) return false;
    const overlaps = interval.startMinutes < other.endMinutes && other.startMinutes < interval.endMinutes;
    return overlaps && normalizeFieldCrew(job).some(name => crew.has(name));
  }).map(job => ({
    id: job.id,
    project: job.project || job.customer || 'Terenski posao',
    workers: normalizeFieldCrew(job).filter(name => crew.has(name)),
    startTime: job.startTime || '08:00',
    endTime: job.endTime || '16:00'
  }));
}

export function summarizeFieldWork(jobs = [], date = new Date().toISOString().slice(0, 10)) {
  const active = jobs.filter(job => !FIELD_WORK_TERMINAL_STATUSES.has(job.status));
  const today = active.filter(job => job.date === date);
  return {
    total: jobs.length,
    active: active.length,
    today: today.length,
    unassigned: active.filter(job => !normalizeFieldCrew(job).length).length,
    overdue: active.filter(job => job.date && job.date < date).length
  };
}

export function validateFieldJob(candidate = {}, jobs = [], workerRecords = {}) {
  const { customer = '', project = '', location = '', date = '', startTime = '08:00', endTime = '16:00' } = candidate;
  if (!customer.trim() || !project.trim() || !location.trim() || !date) return 'Unesi kupca, projekt, lokaciju i datum terenskog rada.';
  if (candidate.distanceKm !== undefined && candidate.distanceKm !== '' && (!Number.isFinite(Number(candidate.distanceKm)) || Number(candidate.distanceKm) < 0)) return 'Ukupna kilometraža mora biti nula ili pozitivan broj.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) return 'Unesi valjano vrijeme početka i završetka.';
  const start = Number(startTime.slice(0,2))*60 + Number(startTime.slice(3));
  const end = Number(endTime.slice(0,2))*60 + Number(endTime.slice(3));
  if (end <= start) return 'Završetak terenskog posla mora biti nakon početka.';
  const crew = normalizeFieldCrew(candidate);
  if (!crew.length) return 'Odaberi barem jednog člana terenske ekipe.';
  const attendance = workerRecords.attendance;
  const deployment = workerRecords.deployment;
  for (const name of crew) {
    if (attendance?.date === date && ['Odsutan','Izvan smjene'].includes(attendance.statuses?.[name])) return name + ' nije dostupan za odabrani datum.';
    if (deployment?.date === date && deployment.assignments?.[name]?.area === 'Radionica') return name + ' je već raspoređen u radionici za odabrani dan.';
  }
  const conflicts = findFieldCrewConflicts(jobs, candidate);
  if (conflicts.length) return 'Sukob rasporeda: ' + conflicts.map(c => c.project + ' (' + c.startTime + '–' + c.endTime + ', ' + c.workers.join(', ') + ')').join('; ') + '. Promijeni termin ili ekipu.';
  return '';
}
export function appendFieldEvent(job, event, at = new Date().toISOString()) {
  const events = Array.isArray(job.events) ? job.events : [];
  return { ...job, events: [...events, { id: 'FWE-' + at + '-' + events.length, type: event, at }] };
}
