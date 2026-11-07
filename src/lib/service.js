export const SERVICE_STATUSES = ['Zaprimljeno','U procjeni','Čeka odobrenje','U radu','Čeka dio / materijal','Završeno','Zatvoreno'];
export const SERVICE_TYPES = ['Reklamacija','Jamstveni servis','Plaćeni servis','Redovni pregled'];
export const SERVICE_PRIORITIES = ['Niska','Normalna','Visoka','Hitna'];

export function serviceCost(record = {}) {
  const parts = Math.max(0, Number(record.partsCost) || 0);
  const labor = Math.max(0, Number(record.laborHours) || 0) * Math.max(0, Number(record.hourlyRate) || 0);
  const travel = Math.max(0, Number(record.travelCost) || 0);
  const other = Math.max(0, Number(record.otherCost) || 0);
  return { parts, labor, travel, other, total: Number((parts + labor + travel + other).toFixed(2)) };
}

export function validateService(record, existing = []) {
  if (!String(record.customerName || '').trim()) return 'Odaberi ili unesi kupca.';
  if (!String(record.title || '').trim()) return 'Unesi naziv problema ili zahvata.';
  if (!String(record.reportedAt || '').trim()) return 'Unesi datum prijave.';
  if (!SERVICE_TYPES.includes(record.type)) return 'Odaberi vrstu servisnog naloga.';
  if (record.dueDate && record.dueDate < record.reportedAt) return 'Rok ne može biti prije datuma prijave.';
  if (record.warrantyUntil && record.reportedAt > record.warrantyUntil && record.type === 'Jamstveni servis') return 'Datum prijave je nakon isteka evidentiranog jamstva.';
  if (record.id && existing.some(item => item.id === record.id && item.closedAt)) return 'Zatvoreni servisni nalog nije moguće mijenjati.';
  return '';
}

export function addServiceEvent(record, event, now = new Date().toISOString()) {
  return { ...record, updatedAt: now, history: [...(record.history || []), { id: now + '-' + (record.history || []).length, date: now, ...event }] };
}

export function isServiceOverdue(record, today) {
  return Boolean(record.dueDate && record.dueDate < today && !['Završeno','Zatvoreno'].includes(record.status));
}
