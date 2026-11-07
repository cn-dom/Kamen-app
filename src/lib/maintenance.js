export function maintenanceCost(record = {}) {
 const parts=Number(record.partsCost)||0, labor=(Number(record.laborHours)||0)*(Number(record.hourlyRate)||0), other=Number(record.otherCost)||0;
 return Math.round((parts+labor+other)*100)/100;
}
export function nextMaintenance(machine = {}) {
 const result=[], days=Number(machine.intervalDays)||0, hours=Number(machine.intervalHours)||0;
 if(days>0&&machine.lastServiceDate){const d=new Date(machine.lastServiceDate+'T12:00:00');d.setDate(d.getDate()+days);result.push(d.toISOString().slice(0,10));}
 if(hours>0)result.push('na '+((Number(machine.lastServiceHours)||0)+hours).toLocaleString('hr-HR')+' h');
 return result.join(' / ');
}
export function maintenanceDue(machine = {}, today = new Date().toISOString().slice(0,10)) {
 if(machine.status==='Izvan pogona'||machine.status==='U servisu')return 'Dospjelo';
 let due=false,soon=false;const days=Number(machine.intervalDays)||0,hours=Number(machine.intervalHours)||0;
 if(days>0&&machine.lastServiceDate){const d=new Date(machine.lastServiceDate+'T12:00:00');d.setDate(d.getDate()+days);const delta=Math.ceil((d-new Date(today+'T12:00:00'))/86400000);if(delta<=0)due=true;else if(delta<=14)soon=true;}
 const nextHours=(Number(machine.lastServiceHours)||0)+hours;
 if(hours>0&&Number(machine.hours)>=nextHours)due=true;else if(hours>0&&Number(machine.hours)>=nextHours-hours*.1)soon=true;
 return due?'Dospjelo':soon?'Uskoro':'U redu';
}
