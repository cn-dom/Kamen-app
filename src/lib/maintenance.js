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


const localDateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T12:00:00').getTime());

export function dashboardOperationalAlerts(machines = [], orders = [], today = localDateKey(new Date())) {
  const alerts = [];
  for (const machine of Array.isArray(machines) ? machines : []) {
    if (!machine || machine.archived) continue;
    const status = maintenanceDue(machine, today);
    if (status === 'U redu') continue;
    alerts.push({
      id: 'machine-' + (machine.id || machine.name),
      type: 'maintenance',
      title: machine.name || 'Stroj bez naziva',
      description: status === 'Dospjelo' ? 'Servis je dospio ili je stroj izvan pogona.' : 'Preventivni servis dospijeva u sljedećih 14 dana ili se približava satni interval.',
      severity: status === 'Dospjelo' ? 'high' : 'medium',
      destination: 'Održavanje strojeva'
    });
  }
  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || ['Završen', 'Otkazan'].includes(order.status) || !validDate(order.due)) continue;
    const due = new Date(order.due + 'T12:00:00');
    const base = new Date(today + 'T12:00:00');
    const days = Math.round((due - base) / 86400000);
    if (days > 3) continue;
    alerts.push({
      id: 'order-' + (order.id || order.project),
      type: 'order',
      title: order.project || order.title || order.id || 'Radni nalog',
      description: days < 0 ? 'Rok je prošao ' + Math.abs(days) + (Math.abs(days) === 1 ? ' dan.' : ' dana.') : days === 0 ? 'Rok je danas.' : 'Rok je za ' + days + (days === 1 ? ' dan.' : ' dana.'),
      severity: days < 0 ? 'high' : 'medium',
      destination: 'Radni nalozi',
      due: order.due
    });
  }
  const priority = { high: 0, medium: 1 };
  return alerts.sort((a, b) => priority[a.severity] - priority[b.severity] || (a.due || '').localeCompare(b.due || '') || a.title.localeCompare(b.title, 'hr'));
}

export function prepareSparePartIssue(materials = [], parts = [], record = {}, now = Date.now()) {
  if (!Array.isArray(parts) || !parts.length) return { ok: true, materials, movements: [], parts: [] };
  const totals = new Map();
  for (const part of parts) {
    const quantity = Number(String(part.quantity ?? '').replace(',', '.'));
    if (!part.materialId || !Number.isFinite(quantity) || quantity <= 0 || Math.round(quantity * 100) !== quantity * 100) {
      return { ok: false, error: 'Količina rezervnog dijela mora biti veća od nule i imati najviše dvije decimale.' };
    }
    totals.set(part.materialId, (totals.get(part.materialId) || 0) + quantity);
  }
  for (const [materialId, quantity] of totals) {
    const item = materials.find(row => row.id === materialId && !row.archived);
    if (!item) return { ok: false, error: 'Jedan od odabranih dijelova više nije dostupan u aktivnom skladištu.' };
    if (quantity > Number(item.quantity || 0) + 1e-9) {
      return { ok: false, error: 'Nema dovoljno zalihe za ' + item.name + '. Na zalihi: ' + Number(item.quantity || 0) + ' ' + (item.unit || 'kom') + '.' };
    }
  }
  const nextMaterials = materials.map(item => {
    const quantity = totals.get(item.id);
    return quantity === undefined ? item : { ...item, quantity: Number((Number(item.quantity || 0) - quantity).toFixed(4)) };
  });
  const date = new Date(now).toLocaleDateString('hr-HR');
  const snapshots = parts.map((part, index) => {
    const item = materials.find(row => row.id === part.materialId);
    const quantity = Number(String(part.quantity).replace(',', '.'));
    return {
      materialId: item.id,
      name: item.name,
      quantity,
      unit: item.unit || 'kom',
      location: item.location || '',
      movementId: now + index
    };
  });
  const movements = snapshots.map(part => ({
    id: part.movementId,
    material: part.name,
    kind: 'Izdavanje - održavanje',
    quantity: part.quantity,
    unit: part.unit,
    location: part.location,
    date,
    reason: 'Servisni nalog ' + (record.id || 'u izradi'),
    referenceId: record.id || '',
    source: 'Održavanje strojeva'
  }));
  return { ok: true, materials: nextMaterials, movements, parts: snapshots };
}


/**
 * Prijedlozi nadopune samo za artikle koje je korisnik označio kao rezervne dijelove.
 * Minimalna zaliha je prag upozorenja; ciljna zaliha određuje količinu za narudžbu.
 */
export function sparePartReorderSuggestions(materials = []) {
  return (Array.isArray(materials) ? materials : [])
    .filter(item => item && !item.archived && item.isSparePart === true)
    .map(item => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const minimum = Math.max(0, Number(item.min) || 0);
      const configuredTarget = Math.max(0, Number(item.reorderTo) || 0);
      const target = configuredTarget > minimum ? configuredTarget : minimum * 2;
      return {
        id: 'spare-part-' + item.id,
        materialId: item.id,
        name: item.name || 'Rezervni dio bez naziva',
        quantity,
        minimum,
        target,
        suggestedQuantity: Math.max(0, Number((target - quantity).toFixed(2))),
        unit: item.unit || 'kom',
        location: item.location || '',
        severity: quantity <= 0 ? 'high' : 'medium'
      };
    })
    .filter(item => item.minimum > 0 && item.quantity <= item.minimum)
    .sort((a, b) => (a.severity === b.severity ? a.name.localeCompare(b.name, 'hr') : a.severity === 'high' ? -1 : 1));
}
