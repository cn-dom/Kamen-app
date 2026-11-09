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

export function validateWorkerSchedule({worker,stage,start,end,workerSkills={},attendance={},deployment={}}){
 const name=String(worker||'').trim();
 if(!name)return 'Odaberi radnika.';
 const skills=workerSkills?.[name];
 if(Array.isArray(skills)&&skills.length){
  const accepted=stage==='Terenski rad / montaža'?['Terenski rad / montaža','Montaža']:stage==='Ručna obrada'?['Ručna obrada','Ostala obrada']:[stage];
  if(!accepted.some(skill=>skills.includes(skill)))return name+' nema evidentiranu vještinu za fazu '+stage+'.';
 }
 const date=String(start||'').slice(0,10),endDate=String(end||'').slice(0,10);
 if(date!==endDate)return 'Jedna aktivnost mora biti unutar istog radnog dana; za višednevni posao izradi odvojene termine.';
 if(attendance?.date===date){
  const status=attendance.statuses?.[name];
  if(status==='Odsutan')return name+' je označen kao odsutan na odabrani dan.';
  if(status==='Izvan smjene')return name+' je označen izvan smjene na odabrani dan.';
 }
 if(deployment?.date===date&&deployment.assignments?.[name]?.area==='Teren'&&stage!=='Terenski rad / montaža')return name+' je već raspoređen na teren za odabrani dan.';
 return '';
}
