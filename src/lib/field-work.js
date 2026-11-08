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
