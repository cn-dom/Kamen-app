export function scheduleIntervalsOverlap(startA, endA, startB, endB) {
  const a = new Date(startA).getTime();
  const b = new Date(endA).getTime();
  const c = new Date(startB).getTime();
  const d = new Date(endB).getTime();
  if (![a,b,c,d].every(Number.isFinite) || b <= a || d <= c) return false;
  return a < d && c < b;
}

export function findScheduleConflict(tasks, draft, excludeId = null) {
  return (Array.isArray(tasks) ? tasks : []).find(task =>
    task.id !== excludeId &&
    task.status !== 'Otkazano' &&
    scheduleIntervalsOverlap(draft.start, draft.end, task.start, task.end) &&
    ((draft.worker && task.worker === draft.worker) || (draft.machine && task.machine === draft.machine))
  ) || null;
}

export function scheduleDurationHours(start, end) {
  const duration = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(duration) ? Math.max(0, duration / 3600000) : 0;
}
