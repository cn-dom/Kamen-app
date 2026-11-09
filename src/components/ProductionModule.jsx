import React, { useEffect, useMemo, useState } from 'react';
import {
  Factory, Search, ClipboardCheck, Clock3, CheckCircle2,
  Play, Pause, Check, AlertTriangle, UserRound, Timer, Download,
  XCircle, RotateCcw, Printer, UserPlus, X
} from 'lucide-react';
import {
  PRODUCTION_STAGES as stages,
  blankStageRecord as blankStage,
  blankPieceProductionRecord as blankUnit,
  buildProductionUnits as unitRows,
  normalizeProductionRecords as normalizeRecords,
  calculateStageElapsedMs as elapsedMs,
  formatProductionDuration as formatDuration,
  calculatePieceProgress as unitProgress
} from '../lib/production.js';

const ORDERS_KEY = 'kamen-app-work-orders-v1';
const MATERIALS_KEY = 'kamen-app-materials-v1';
const EQUIPMENT_KEY = 'kamen-app-equipment-register-v1';
const PRODUCTION_KEY = 'kamen-app-production-stages-v1';
const SCHEDULE_KEY = 'kamen-app-schedule-v1';
function syncLinkedScheduleTask(stage, status, timestamp) {
  const taskId = stage?.scheduleTaskId;
  if (!taskId) return;
  try {
    const tasks = JSON.parse(window.localStorage.getItem(SCHEDULE_KEY) || '[]');
    if (!Array.isArray(tasks)) return;
    let changed = false;
    const next = tasks.map(task => {
      if (task.id !== taskId) return task;
      changed = true;
      return {
        ...task,
        status,
        ...(status === 'U tijeku' ? { actualStartedAt: task.actualStartedAt || timestamp } : {}),
        ...(status === 'Završeno' ? { completedAt: timestamp } : {}),
        updatedAt: timestamp
      };
    });
    if (changed) {
      window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('kamen-app-schedule-updated'));
    }
  } catch { /* Raspored ostaje nepromijenjen ako lokalna pohrana nije dostupna. */ }
}
const todayKey = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
function readJson(key, fallback) {
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function csvCell(value) {
  const text = String(value ?? '');
  return '"' + text.replaceAll('"', '""') + '"';
}

export default function ProductionModule({ onBack, onCreateProject }) {
  const [orders, setOrders] = useState(() => readJson(ORDERS_KEY, []));
  const [materials, setMaterials] = useState(() => readJson(MATERIALS_KEY, []));
  const [equipment, setEquipment] = useState(() => readJson(EQUIPMENT_KEY, []));
  const [records, setRecords] = useState(() => normalizeRecords(readJson(PRODUCTION_KEY, {}), readJson(ORDERS_KEY, [])));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Aktivni');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [newWorker, setNewWorker] = useState('');
  const [clockNow, setClockNow] = useState(Date.now());
  const [sawAssignments, setSawAssignments] = useState(() => readJson('kamen-app-saw-assignments-v1', {}));
  useEffect(() => {
    try { window.localStorage.setItem('kamen-app-saw-assignments-v1', JSON.stringify(sawAssignments)); }
    catch { /* Browser storage may be unavailable. */ }
  }, [sawAssignments]);


  useEffect(() => {
    try { window.localStorage.setItem(PRODUCTION_KEY, JSON.stringify(records)); }
    catch { /* Browser storage may be unavailable or full. */ }
  }, [records]);
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const refresh = () => {
      const nextOrders = readJson(ORDERS_KEY, []);
      setOrders(nextOrders);
      setMaterials(readJson(MATERIALS_KEY, []));
      setEquipment(readJson(EQUIPMENT_KEY, []));
      setRecords(current => {
        const saved = readJson(PRODUCTION_KEY, current);
        const migrated = normalizeRecords(saved, nextOrders);
        return { ...migrated, pieces: { ...migrated.pieces } };
      });
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const rows = useMemo(() => unitRows(orders, materials), [orders, materials]);
  const recordFor = key => records.pieces?.[key] || blankUnit();
  const updateUnit = (key, updater) => setRecords(current => {
    const previous = current.pieces?.[key] || blankUnit();
    const next = typeof updater === 'function' ? updater(previous) : updater;
    return { ...current, version: 2, pieces: { ...(current.pieces || {}), [key]: { ...next, updatedAt: new Date().toISOString() } } };
  });
  const updateStage = (key, stageName, updater) => updateUnit(key, unit => {
    const previous = unit.stages?.[stageName] || blankStage();
    const next = typeof updater === 'function' ? updater(previous) : updater;
    const history = next.status !== previous.status
      ? [...(previous.history || []), { from: previous.status, to: next.status, at: new Date().toISOString(), reason: next.blockedReason || previous.blockedReason || '' }]
      : (next.history || previous.history || []);
    return { ...unit, stages: { ...unit.stages, [stageName]: { ...next, history } } };
  });

  const startStage = (key, stageName) => {
    const unit = records.pieces?.[key] || blankUnit();
    const currentStage = unit.stages?.[stageName] || blankStage();
    if (currentStage.status === 'Završeno' || currentStage.status === 'Nije potrebno' || currentStage.status === 'U tijeku') return;
    if (!String(currentStage.assignedTo || '').trim()) { window.alert('Prije početka faze odaberi ili upiši odgovornog radnika.'); return; }
    const workerName = String(currentStage.assignedTo).trim().toLocaleLowerCase('hr');
    const today = todayKey();
    const attendanceStatus = records.attendance?.date === today ? records.attendance.statuses?.[currentStage.assignedTo] : '';
    const deployment = records.deployment?.date === today ? records.deployment.assignments?.[currentStage.assignedTo] : null;
    if (attendanceStatus === 'Odsutan' || attendanceStatus === 'Izvan smjene') { window.alert('Radnik je evidentiran kao odsutan ili izvan smjene. Promijeni prisutnost prije početka faze.'); return; }
    if (deployment?.area === 'Teren') { window.alert('Radnik je danas raspoređen na teren i nije slobodan kapacitet radionice.'); return; }
    const skills = records.workerSkills?.[currentStage.assignedTo] || [];
    if (skills.length && !skills.includes(stageName)) { window.alert('Radniku nije evidentirana vještina za ovu fazu. Provjeri raspored i vještine prije početka.'); return; }
    const currentEquipmentId = currentStage.equipmentId || '';
    const occupied = Object.entries(records.pieces || {}).flatMap(([otherKey, otherUnit]) => stages.flatMap(otherStageName => {
      const otherStage = otherUnit.stages?.[otherStageName] || blankStage();
      if (otherStage.status !== 'U tijeku' || (otherKey === key && otherStageName === stageName)) return [];
      return [{ key: otherKey, stageName: otherStageName, worker: String(otherStage.assignedTo || '').trim().toLocaleLowerCase('hr'), equipmentId: otherStage.equipmentId || '' }];
    }));
    if (occupied.some(item => item.worker && item.worker === workerName)) { window.alert('Sukob rasporeda: ovaj radnik već ima drugu fazu u tijeku.'); return; }
    if (currentEquipmentId && occupied.some(item => item.equipmentId === currentEquipmentId)) { window.alert('Sukob stroja: odabrani stroj već se koristi u drugoj aktivnoj fazi.'); return; }
    const selectedEquipment = equipment.find(item => item.id === currentEquipmentId);
    if (selectedEquipment && selectedEquipment.status === 'Izvan pogona') { window.alert('Odabrani stroj je označen kao izvan pogona.'); return; }
    const stageIndex = stages.indexOf(stageName);
    if (stages.slice(0, stageIndex).some(previousStage => !['Završeno', 'Nije potrebno'].includes(unit.stages?.[previousStage]?.status))) {
      window.alert('Najprije završi prethodnu fazu obrade ili je označi kao nije potrebnu.');
      return;
    }
    const now = new Date().toISOString();
    updateStage(key, stageName, previous => ({
      ...previous, status: 'U tijeku', startedAt: previous.startedAt || now,
      completedAt: null, blockedReason: '',
      sessions: [...(previous.sessions || []), { startedAt: now, endedAt: null }]
    }));
    syncLinkedScheduleTask(currentStage, 'U tijeku', now);
  };
  const stopStage = (key, stageName) => {
    const currentStage = records.pieces?.[key]?.stages?.[stageName] || blankStage();
    if (currentStage.status !== 'U tijeku') return;
    const reason = window.prompt('Upiši razlog zastoja. Primjer: kvar stroja, čekanje materijala, promjena nacrta.');
    if (!reason?.trim()) return;
    const now = new Date().toISOString();
    updateStage(key, stageName, previous => {
      if (previous.status !== 'U tijeku') return previous;
      const sessions = [...(previous.sessions || [])];
      let open = sessions.length - 1;
      while (open >= 0 && sessions[open].endedAt) open -= 1;
      if (open >= 0) sessions[open] = { ...sessions[open], endedAt: now };
      return { ...previous, status: 'Zastoj', blockedReason: reason.trim(), sessions };
    });
    syncLinkedScheduleTask(currentStage, 'Zastoj', now, reason.trim());
  };
  const finishStage = (key, stageName) => {
    const currentStage = records.pieces?.[key]?.stages?.[stageName] || blankStage();
    if (currentStage.status !== 'U tijeku') return;
    const now = new Date().toISOString();
    updateStage(key, stageName, previous => {
      if (previous.status !== 'U tijeku') return previous;
      const sessions = [...(previous.sessions || [])];
      let open = sessions.length - 1;
      while (open >= 0 && sessions[open].endedAt) open -= 1;
      if (open >= 0) sessions[open] = { ...sessions[open], endedAt: now };
      return { ...previous, status: 'Završeno', completedAt: now, blockedReason: '', sessions };
    });
    syncLinkedScheduleTask(currentStage, 'Završeno', now);
  };
  const setStageWorker = (key, stageName, assignedTo) => updateStage(key, stageName, previous => ({ ...previous, assignedTo }));
  const setStageNote = (key, stageName, note) => updateStage(key, stageName, previous => ({ ...previous, note }));
  const markNotRequired = (key, stageName) => {
    if (!window.confirm('Označiti fazu „' + stageName + '” kao nije potrebnu za ovaj komad?')) return;
    updateStage(key, stageName, previous => ({ ...previous, status: 'Nije potrebno', completedAt: new Date().toISOString(), blockedReason: '' }));
  };
  const resetStage = (key, stageName, orderId) => {
    const stageIndex = stages.indexOf(stageName);
    const affectedStages = stages.slice(stageIndex);
    if (!window.confirm('Vratiti fazu „' + stageName + '” na doradu? Ova i sve sljedeće faze ponovno će se otvoriti; već evidentirani radni intervali i povijest ostaju sačuvani.')) return;
    const latestOrders = readJson(ORDERS_KEY, orders);
    const targetOrder = latestOrders.find(order => order.id === orderId);
    if (targetOrder?.status === 'Završen') {
      const now = new Date().toISOString();
      const reopenedOrders = latestOrders.map(order => order.id === orderId
        ? { ...order, status: 'U tijeku', statusHistory: [...(order.statusHistory || []), { from: 'Završen', to: 'U tijeku', at: now, reason: 'Ponovno otvoren zbog dorade komada' }] }
        : order);
      try { window.localStorage.setItem(ORDERS_KEY, JSON.stringify(reopenedOrders)); } catch {}
      setOrders(reopenedOrders);
    }
    updateUnit(key, unit => {
      const nextStages = { ...unit.stages };
      const now = new Date().toISOString();
      affectedStages.forEach(affectedName => {
        const previous = nextStages[affectedName] || blankStage();
        const sessions = [...(previous.sessions || [])];
        let open = sessions.length - 1;
        while (open >= 0 && sessions[open].endedAt) open -= 1;
        if (open >= 0) sessions[open] = { ...sessions[open], endedAt: now };
        if (previous.status !== 'Nije započeto') {
          nextStages[affectedName] = {
            ...previous, status: 'Nije započeto', completedAt: null, blockedReason: '', sessions,
            history: [...(previous.history || []), { from: previous.status, to: 'Nije započeto', at: now, reason: 'Ponovno otvaranje zbog dorade prethodne faze' }]
          };
        }
      });
      const quality = unit.quality?.status !== 'Čeka kontrolu'
        ? { ...unit.quality, status: 'Čeka kontrolu', checkedAt: null, history: [...(unit.quality.history || []), { status: 'Čeka kontrolu', at: now, note: 'Ponovno otvorena nakon vraćanja faze na doradu' }] }
        : unit.quality;
      return { ...unit, stages: nextStages, quality };
    });
  };
  const updateQuality = (key, status) => {
    const currentUnit = records.pieces?.[key] || blankUnit();
    const currentQuality = currentUnit.quality || blankUnit().quality;
    if (status !== 'Čeka kontrolu' && !stages.every(stageName => ['Završeno', 'Nije potrebno'].includes(currentUnit.stages?.[stageName]?.status))) {
      window.alert('Kontrola kvalitete može se potvrditi tek nakon završetka svih potrebnih faza.');
      return;
    }
    if (status !== 'Čeka kontrolu' && !String(currentQuality.checkedBy || '').trim()) {
      window.alert('Prije potvrde kontrole upiši ime osobe koja je obavila kontrolu.');
      return;
    }
    let reason = '';
    if (status === 'Neispravno') {
      reason = window.prompt('Opiši nedostatak koji je pronađen na kontroli:') || '';
      if (!reason.trim()) return;
    }
    updateUnit(key, unit => ({
      ...unit,
      quality: {
        ...unit.quality, status, checkedAt: status === 'Čeka kontrolu' ? null : new Date().toISOString(),
        note: status === 'Neispravno' ? reason.trim() : (status === 'Prošlo' ? '' : unit.quality.note),
        history: [...(unit.quality.history || []), { status, at: new Date().toISOString(), note: reason.trim() }]
      }
    }));
  };
  const updateQualityField = (key, field, value) => updateUnit(key, unit => ({ ...unit, quality: { ...unit.quality, [field]: value } }));
  const addWorker = event => {
    event.preventDefault();
    const name = newWorker.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const currentWorkers = Array.isArray(records.workers) ? records.workers : [];
    const exists = currentWorkers.some(worker => String(worker).toLocaleLowerCase('hr') === name.toLocaleLowerCase('hr'));
    if (exists) {
      window.alert('Radnik s tim imenom već postoji u popisu.');
      return;
    }
    const nextRecords = { ...records, version: 2, workers: [...currentWorkers, name] };
    setRecords(nextRecords);
    try {
      window.localStorage.setItem(PRODUCTION_KEY, JSON.stringify(nextRecords));
    } catch {
      window.alert('Radnik nije spremljen. Provjeri je li preglednik dopustio spremanje podataka.');
      return;
    }
    setNewWorker('');
  };
  const setWorkerAttendance = (name, status) => setRecords(current => {
    const date = todayKey();
    const attendance = current.attendance?.date === date
      ? current.attendance
      : { date, statuses: {} };
    return { ...current, attendance: { ...attendance, statuses: { ...(attendance.statuses || {}), [name]: status } } };
  });
  const setWorkerDeployment = (name, field, value) => setRecords(current => {
    const date = todayKey();
    const deployment = current.deployment?.date === date
      ? current.deployment
      : { date, assignments: {} };
    const previous = deployment.assignments?.[name] || { area: 'Radionica', task: '', location: '' };
    return {
      ...current,
      deployment: {
        ...deployment,
        assignments: {
          ...(deployment.assignments || {}),
          [name]: { ...previous, [field]: value }
        }
      }
    };
  });
  const removeWorker = name => {
    if (!window.confirm('Ukloniti radnika „' + name + '” iz popisa? Već evidentirane dodjele ostaju sačuvane.')) return;
    setRecords(current => ({ ...current, workers: (current.workers || []).filter(worker => worker !== name) }));
  };

  const rowsWithRecords = useMemo(() => rows.map(row => ({ ...row, record: records.pieces?.[row.key] || blankUnit() })), [rows, records]);
  const workerHasTask = (row, stageNames = stages) => !selectedWorker || stageNames.some(stageName => {
    const stage = row.record.stages?.[stageName] || blankStage();
    return stage.assignedTo === selectedWorker && !['Završeno','Nije potrebno'].includes(stage.status);
  });
  const visibleRows = useMemo(() => rowsWithRecords.filter(row => {
    const record = row.record;
    const search = [row.order.id, row.order.project, row.order.customer, row.label, row.material].join(' ').toLocaleLowerCase('hr');
    const matchesQuery = !query.trim() || search.includes(query.trim().toLocaleLowerCase('hr'));
    const statuses = stages.map(stage => record.stages?.[stage]?.status || 'Nije započeto');
    const blocked = statuses.includes('Zastoj');
    const active = statuses.includes('U tijeku');
    const done = statuses.every(status => ['Završeno', 'Nije potrebno'].includes(status));
    const matchesFilter = filter === 'Svi' ||
      (filter === 'Aktivni' && !['Završen', 'Otkazan'].includes(row.order.status)) ||
      (filter === 'U tijeku' && active) ||
      (filter === 'Zastoj' && blocked) ||
      (filter === 'Kontrola' && done && record.quality.status !== 'Prošlo') ||
      (filter === 'Završeni' && done && record.quality.status === 'Prošlo');
    return matchesQuery && matchesFilter && workerHasTask(row) && row.order.status !== 'Otkazan';
  }), [rowsWithRecords, query, filter, selectedWorker]);
  const activeOrders = orders.filter(order => !['Završen', 'Otkazan'].includes(order.status));
  const inProgress = rowsWithRecords.reduce((sum, row) => sum + stages.filter(stage => row.record.stages?.[stage]?.status === 'U tijeku').length, 0);
  const blocked = rowsWithRecords.reduce((sum, row) => sum + stages.filter(stage => row.record.stages?.[stage]?.status === 'Zastoj').length, 0);
  const passedQuality = rowsWithRecords.filter(row => row.record.quality.status === 'Prošlo').length;
  const readyForQuality = rowsWithRecords.filter(row => stages.every(stage => ['Završeno', 'Nije potrebno'].includes(row.record.stages?.[stage]?.status)) && row.record.quality.status !== 'Prošlo').length;
  const groups = useMemo(() => {
    const map = new Map();
    visibleRows.forEach(row => {
      if (!map.has(row.order.id)) map.set(row.order.id, { order: row.order, rows: [] });
      map.get(row.order.id).rows.push(row);
    });
    return [...map.values()];
  }, [visibleRows]);

  const activeAssignments = useMemo(() => rowsWithRecords.flatMap(row => stages.flatMap(stageName => {
    const stage = row.record.stages?.[stageName] || blankStage();
    if (!['U tijeku', 'Zastoj'].includes(stage.status)) return [];
    return [{ key: row.key, orderId: row.order.id, project: row.order.project || 'Projekt bez naziva', piece: row.label, stageName, status: stage.status, worker: stage.assignedTo || 'Nije dodijeljen', workerKey: String(stage.assignedTo || '').trim().toLocaleLowerCase('hr'), equipmentId: stage.equipmentId || '', equipmentName: equipment.find(item => item.id === stage.equipmentId)?.name || 'Bez stroja', duration: elapsedMs(stage, clockNow), reason: stage.blockedReason || '' }];
  })), [rowsWithRecords, equipment, clockNow]);
  const workerLoads = useMemo(() => {
    const map = new Map();
    activeAssignments.filter(item => item.status === 'U tijeku' && item.workerKey).forEach(item => {
      const entry = map.get(item.worker) || { name: item.worker, count: 0, minutes: 0, tasks: [] };
      entry.count += 1; entry.minutes += item.duration / 60000; entry.tasks.push(item);
      map.set(item.worker, entry);
    });
    return [...map.values()].sort((a,b) => b.count-a.count || b.minutes-a.minutes);
  }, [activeAssignments]);
  const machineLoads = useMemo(() => {
    const map = new Map();
    activeAssignments.filter(item => item.status === 'U tijeku' && item.equipmentId).forEach(item => {
      const entry = map.get(item.equipmentId) || { id: item.equipmentId, name: item.equipmentName, count: 0, minutes: 0, tasks: [] };
      entry.count += 1; entry.minutes += item.duration / 60000; entry.tasks.push(item);
      map.set(item.equipmentId, entry);
    });
    return [...map.values()].sort((a,b) => b.count-a.count || b.minutes-a.minutes);
  }, [activeAssignments]);
  const resourceConflicts = useMemo(() => {
    const active = activeAssignments.filter(item => item.status === 'U tijeku');
    const conflicts = [];
    const byWorker = new Map(); const byMachine = new Map();
    active.forEach(item => {
      if (item.workerKey) { const list = byWorker.get(item.workerKey) || []; list.push(item); byWorker.set(item.workerKey,list); }
      if (item.equipmentId) { const list = byMachine.get(item.equipmentId) || []; list.push(item); byMachine.set(item.equipmentId,list); }
    });
    byWorker.forEach((items,key) => { if(items.length>1) conflicts.push({type:'Radnik',name:items[0].worker,items}); });
    byMachine.forEach((items,key) => { if(items.length>1) conflicts.push({type:'Stroj',name:items[0].equipmentName,items}); });
    return conflicts;
  }, [activeAssignments]);
  const todayCapacityWarnings = useMemo(() => workerLoads.flatMap(load => {
    const attendance = records.attendance?.date === todayKey() ? records.attendance.statuses?.[load.name] : '';
    const deployment = records.deployment?.date === todayKey() ? records.deployment.assignments?.[load.name] : null;
    if (attendance === 'Odsutan' || attendance === 'Izvan smjene' || deployment?.area === 'Teren') return [{ name: load.name, reason: deployment?.area === 'Teren' ? 'Raspoređen na teren' : attendance }];
    return [];
  }), [workerLoads, records.attendance, records.deployment]);

  const exportCsv = () => {
    const headers = ['Radni nalog', 'Kupac', 'Projekt', 'Komad', 'Redni broj', 'Materijal', 'Duljina cm', 'Širina cm', 'Debljina cm', 'Faza', 'Status', 'Radnik', 'Stroj / oprema', 'Početak', 'Završetak', 'Trajanje minuta', 'Razlog zastoja', 'Napomena', 'Kontrola kvalitete'];
    const lines = [headers.map(csvCell).join(';')];
    visibleRows.forEach(row => stages.forEach(stageName => {
      const stage = row.record.stages?.[stageName] || blankStage();
      lines.push([
        row.order.id, row.order.customer, row.order.project, row.label, row.unitIndex, row.material,
        row.piece.length, row.piece.width, row.piece.thickness, stageName, stage.status, stage.assignedTo,
        equipment.find(item => item.id === stage.equipmentId)?.name || '',
        formatDate(stage.startedAt), formatDate(stage.completedAt), Math.round(elapsedMs(stage) / 60000),
        stage.blockedReason, stage.note, row.record.quality.status
      ].map(csvCell).join(';'));
    }));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kamen-app-proizvodnja-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="page-content module-page production-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> RADIONICA I OBRADA</div><h1>Proizvodnja</h1><p className="subtitle">Jednostavan pregled komada, radnika i napretka obrade.</p></div>
      <div className="welcome-actions production-actions">
        <button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button>
        <button className="button button-primary" onClick={onCreateProject}><UserPlus size={15}/> Novi projekt / zadatak</button>
        <button className="button button-secondary" onClick={() => window.print()}><Printer size={15}/> Ispiši prikaz</button>
        <button className="button button-primary" onClick={exportCsv}><Download size={15}/> Izvoz CSV</button>
      </div>
    </section>
    <section className="stats-grid warehouse-stats production-metrics">
      <article className="stat-card"><div className="stat-top"><span>Aktivni nalozi</span><span className="stat-icon blue-icon"><Factory size={18}/></span></div><div className="stat-value">{activeOrders.length}<span className="stat-unit">naloga</span></div><div className="stat-foot">U proizvodnom procesu</div></article>
      <article className="stat-card"><div className="stat-top"><span>Faze u tijeku</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{inProgress}<span className="stat-unit">faza</span></div><div className="stat-foot">Aktivni radni intervali</div></article>
      <article className="stat-card"><div className="stat-top"><span>Zastoji</span><span className="stat-icon red-icon"><AlertTriangle size={18}/></span></div><div className="stat-value">{blocked}<span className="stat-unit">faza</span></div><div className="stat-foot">Čekaju rješavanje</div></article>
      <article className="stat-card"><div className="stat-top"><span>Prošla kontrola</span><span className="stat-icon green-icon"><CheckCircle2 size={18}/></span></div><div className="stat-value">{passedQuality}<span className="stat-unit">komada</span></div><div className="stat-foot">{readyForQuality} spremno za kontrolu</div></article>
    </section>
    <section className="panel production-capacity-panel">
      <div className="panel-heading"><div><h2>Plan rada i opterećenje resursa</h2><p>Pregled aktivnih faza, zauzetosti radnika i strojeva te upozorenja na preklapanja.</p></div><span className="demo-label"><span/> AŽURIRA SE IZ EVIDENCIJE</span></div>
      <div className="production-capacity-grid">
        <div className="production-capacity-column"><div className="production-capacity-title"><UserRound size={16}/><strong>Radnici u aktivnom radu</strong><span>{workerLoads.length}</span></div>
          {workerLoads.length ? workerLoads.map(load => <article className="production-resource-row" key={load.name}><div className="production-resource-top"><strong>{load.name}</strong><b>{load.count} {load.count === 1 ? 'faza' : 'faze'}</b></div><div className="production-resource-track"><i style={{width: Math.min(100,load.count*50)+'%'}}/></div><small>{formatDuration(load.minutes*60000)} evidentiranog aktivnog vremena · {load.tasks.map(task=>task.stageName).join(', ')}</small></article>) : <p className="production-capacity-empty">Trenutačno nema aktivnih radnih intervala.</p>}
        </div>
        <div className="production-capacity-column"><div className="production-capacity-title"><Factory size={16}/><strong>Strojevi u uporabi</strong><span>{machineLoads.length}</span></div>
          {machineLoads.length ? machineLoads.map(load => <article className="production-resource-row" key={load.id}><div className="production-resource-top"><strong>{load.name}</strong><b>{load.count} {load.count === 1 ? 'faza' : 'faze'}</b></div><div className="production-resource-track machine"><i style={{width: Math.min(100,load.count*50)+'%'}}/></div><small>{formatDuration(load.minutes*60000)} aktivnog vremena · {load.tasks.map(task=>task.stageName).join(', ')}</small></article>) : <p className="production-capacity-empty">Nijedan stroj trenutačno nije vezan uz aktivnu fazu.</p>}
        </div>
        <div className="production-capacity-column production-alert-column"><div className="production-capacity-title"><AlertTriangle size={16}/><strong>Kontrola rasporeda</strong><span>{resourceConflicts.length+todayCapacityWarnings.length+activeAssignments.filter(item=>item.status==='Zastoj').length}</span></div>
          {resourceConflicts.map((conflict,index)=><article className="production-resource-alert" key={conflict.type+conflict.name+index}><strong>{conflict.type}: {conflict.name}</strong><small>{conflict.items.length} istodobne aktivne faze — provjeri raspored.</small></article>)}
          {todayCapacityWarnings.map(item=><article className="production-resource-alert" key={item.name}><strong>{item.name}</strong><small>{item.reason} — provjeri aktivne zadatke.</small></article>)}
          {activeAssignments.filter(item=>item.status==='Zastoj').map(item=><article className="production-resource-alert blocked" key={item.key+item.stageName}><strong>{item.orderId} · {item.stageName}</strong><small>{item.reason || 'Zastoj čeka rješavanje'}</small></article>)}
          {!resourceConflicts.length&&!todayCapacityWarnings.length&&!activeAssignments.some(item=>item.status==='Zastoj')&&<p className="production-capacity-empty success">Nema evidentiranih sukoba ni zastoja.</p>}
        </div>
      </div>
      <div className="production-capacity-footer"><span>Aktivno: <strong>{activeAssignments.filter(item=>item.status==='U tijeku').length}</strong></span><span>Zastoji: <strong>{activeAssignments.filter(item=>item.status==='Zastoj').length}</strong></span><span>Prepoznati sukobi: <strong>{resourceConflicts.length}</strong></span><span>Ovaj pregled ne mijenja dodjele ni stanje skladišta.</span></div>
    </section>
    <section className="panel warehouse-panel production-workspace">
      <div className="panel-heading"><div><h2>Proizvodnja po komadima</h2><p>Svaka jedinica narudžbe ima vlastite faze, radnika, vremenske zapise i kontrolu.</p></div><span className="demo-label"><span/> LOKALNA EVIDENCIJA</span></div>
      <section className="production-team">
        <div className="production-team-heading"><UserRound size={17}/><div><strong>Popis radnika</strong><small>Odabir radnika dostupan je u svakoj fazi obrade.</small></div></div>
        <form className="production-team-form" onSubmit={addWorker}><input value={newWorker} onChange={event => setNewWorker(event.target.value)} placeholder="Ime i prezime radnika" aria-label="Ime i prezime radnika"/><button className="button button-secondary" type="submit" disabled={!newWorker.trim()}><UserPlus size={14}/> Dodaj radnika</button></form>
        <details className="production-team-settings"><summary>Postavke radnika · prisutnost, raspored i vještine</summary><div className="production-team-settings-content"><div className="production-worker-roster">{(records.workers || []).map(worker => {
          const deployment = records.deployment?.date === todayKey() ? records.deployment.assignments?.[worker] : null;
          const area = deployment?.area || 'Radionica';
          return <article className="production-worker-card" key={worker}>
            <div className="production-worker-card-head"><strong>{worker}</strong><button type="button" onClick={() => removeWorker(worker)} aria-label={'Ukloni ' + worker}><X size={12}/></button></div>
            <label><span>Prisutnost</span><select aria-label={'Današnja prisutnost: ' + worker} value={records.attendance?.date === todayKey() ? (records.attendance.statuses?.[worker] || 'Nije evidentirano') : 'Nije evidentirano'} onChange={event => setWorkerAttendance(worker, event.target.value)}><option value="Nije evidentirano">Nije evidentirano</option><option value="Prisutan">Prisutan</option><option value="Odsutan">Odsutan</option><option value="Izvan smjene">Izvan smjene</option></select></label>
            <label><span>Raspored rada</span><select aria-label={'Mjesto rada: ' + worker} value={area} onChange={event => setWorkerDeployment(worker, 'area', event.target.value)}><option value="Radionica">Radionica</option><option value="Teren">Na terenu</option></select></label>
            {area === 'Teren' && <div className="production-field-details">
              <label><span>Vrsta terenskog posla</span><input value={deployment?.task || ''} onChange={event => setWorkerDeployment(worker, 'task', event.target.value)} placeholder="Npr. montaža, izmjera, servis"/></label>
              <label><span>Lokacija / kupac</span><input value={deployment?.location || ''} onChange={event => setWorkerDeployment(worker, 'location', event.target.value)} placeholder="Adresa, mjesto ili kupac"/></label>
            </div>}
            <div className="worker-skill-list">
              <span>Vještine radnika</span>
              <div>{['Pilanje','Kanterica / obrada rubova','Poliranje','Ostala obrada','Montaža','Izmjera','Prijevoz','Servis'].map(skill => <label key={skill}><input type="checkbox" checked={(records.workerSkills?.[worker] || []).includes(skill)} onChange={event => setRecords(current => { const previous = current.workerSkills?.[worker] || []; const next = event.target.checked ? [...new Set([...previous, skill])] : previous.filter(item => item !== skill); return { ...current, workerSkills: { ...(current.workerSkills || {}), [worker]: next } }; })}/><span>{skill}</span></label>)}</div>
            </div>
          </article>;
        })}{!(records.workers || []).length && <small>Još nema unesenih radnika. Ime se može upisati i izravno u fazi.</small>}</div>
<p className="production-attendance-note">Prisutnost i raspored vode se odvojeno za današnji datum. Radnik na terenu nije slobodan kapacitet radionice.</p>
        <datalist id="production-worker-list">{(records.workers || []).map(worker => <option key={worker} value={worker}/>)}</datalist></div></details>
      </section>
      <section className="production-saw-board">
        <div className="production-saw-board-heading"><div><span className="eyebrow">RADNA PLOČA · PILANJE</span><h3>Dvije mostne pile</h3><p>Poslovi se preuzimaju iz radnih naloga. Odaberi pilu, a nakon fizičkog rezanja potvrdi završetak.</p></div><span className="production-saw-count">{rowsWithRecords.filter(row => !['Završeno','Nije potrebno'].includes(row.record.stages?.['Pilanje']?.status)).length} za pilanje</span></div>
        <div className="production-saw-columns">
          {[1,2].map(machine => {
            const machineRows = rowsWithRecords.filter(row => workerHasTask(row, ['Pilanje']) && !['Završeno','Nije potrebno'].includes(row.record.stages?.['Pilanje']?.status) && (sawAssignments[row.key] || '1') === String(machine));
            return <section className="production-saw-lane" key={machine}>
              <h4><Factory size={16}/> Pila {machine}<small>{machineRows.length} poslova</small></h4>
              {machineRows.length ? machineRows.map(row => {
                const stage = row.record.stages?.['Pilanje'] || blankStage();
                return <article className="production-saw-job" key={row.key}>
                  <strong>{row.order.id} · {row.label} #{row.unitIndex}</strong>
                  <span>{row.material} · {row.piece.length} × {row.piece.width} × {row.piece.thickness} cm</span>
                  <div className="production-saw-job-actions">
                    <select aria-label={'Odaberi pilu za ' + row.label} value={sawAssignments[row.key] || '1'} onChange={event => setSawAssignments(current => ({...current,[row.key]:event.target.value}))}><option value="1">Pila 1</option><option value="2">Pila 2</option></select>
                    <button type="button" className="button button-success" onClick={() => {
                      const now = new Date().toISOString();
                      updateStage(row.key, 'Pilanje', previous => {
                        if (['Završeno','Nije potrebno'].includes(previous.status)) return previous;
                        const sessions = [...(previous.sessions || [])];
                        let open = sessions.length - 1;
                        while (open >= 0 && sessions[open].endedAt) open -= 1;
                        if (open >= 0) sessions[open] = {...sessions[open],endedAt:now};
                        return {...previous,status:'Završeno',completedAt:now,blockedReason:'',sessions};
                      });
                    }}><Check size={14}/> Gotovo</button>
                  </div>
                  {stage.status === 'U tijeku' && <small>U tijeku · {stage.assignedTo || 'Radnik nije naveden'}</small>}
                </article>;
              }) : <p className="production-saw-empty">Nema poslova na čekanju.</p>}
            </section>;
          })}
        </div>
        <small className="production-saw-footnote">Ova ploča samo prati redoslijed i status pilanja. Ne upravlja elektronikom pile i ne mijenja stanje skladišta niti evidentira potrošnju materijala.</small>
      </section>
      <section className="production-station-board">
        <div className="production-station-heading">
          <div><span className="eyebrow">RADNE STANICE · OBRADA</span><h3>Radna ploča radionice</h3><p>Prikazuje komade koji su spremni za sljedeću fazu. Otvori fazu za detalje ili završi aktivan posao.</p></div>
          <span className="production-saw-count">{rowsWithRecords.filter(row => stages.slice(1).some((stageName,index) => {
            const stage = row.record.stages?.[stageName] || blankStage();
            const ready = stages.slice(0,index+1).every(previous => ['Završeno','Nije potrebno'].includes(row.record.stages?.[previous]?.status));
            return ready && !['Završeno','Nije potrebno'].includes(stage.status);
          })).length} spremnih komada</span>
        </div>
        <div className="production-station-grid">
          {[
            { id:'Kanterica / obrada rubova', title:'Kanterica · obline', stage:'Kanterica / obrada rubova' },
            { id:'Polirka za šmuse i okapnice', title:'Polirka · šmuse i okapnice', stage:'Poliranje' },
            { id:'Vanjska polirka za ravne spomenike i obloge', title:'Vanjska polirka · ravne površine', stage:'Poliranje' },
            { id:'Ručna obrada', title:'Ručna obrada', stage:'Ostala obrada' },
            { id:'Terenski rad / montaža grobnica', title:'Teren · montaža grobnica', stage:'Ostala obrada' },
            { id:'Nije raspoređeno', title:'Čeka raspored', stage:null }
          ].map(center => {
            const stationRows = rowsWithRecords.filter(row => {
              if (selectedWorker && center.stage && !workerHasTask(row, [center.stage])) return false;
              if (selectedWorker && !center.stage && !workerHasTask(row, ['Poliranje','Ostala obrada'])) return false;
              if (!center.stage) {
                return ['Poliranje','Ostala obrada'].some(name => {
                  const stage = row.record.stages?.[name] || blankStage();
                  const index = stages.indexOf(name);
                  return stages.slice(0,index).every(previous => ['Završeno','Nije potrebno'].includes(row.record.stages?.[previous]?.status)) &&
                    !['Završeno','Nije potrebno'].includes(stage.status) && !stage.workCenter;
                });
              }
              const stage = row.record.stages?.[center.stage] || blankStage();
              const index = stages.indexOf(center.stage);
              const ready = stages.slice(0,index).every(previous => ['Završeno','Nije potrebno'].includes(row.record.stages?.[previous]?.status));
              const selectedCenter = stage.workCenter || '';
              return ready && !['Završeno','Nije potrebno'].includes(stage.status) &&
                (center.stage === 'Kanterica / obrada rubova' || selectedCenter === center.id);
            }).filter(row => center.stage ? true : (['Poliranje','Ostala obrada'].some(name => {
              const stage = row.record.stages?.[name] || blankStage();
              const index = stages.indexOf(name);
              return stages.slice(0,index).every(previous => ['Završeno','Nije potrebno'].includes(row.record.stages?.[previous]?.status)) &&
                !['Završeno','Nije potrebno'].includes(stage.status) && !stage.workCenter;
            })));
            return <section className="production-station-lane" key={center.id}>
              <h4><Factory size={16}/>{center.title}<small>{stationRows.length} kom.</small></h4>
              {stationRows.length ? stationRows.map(row => {
                const stageName = center.stage || ['Poliranje','Ostala obrada'].find(name => {
                  const stage = row.record.stages?.[name] || blankStage();
                  const index = stages.indexOf(name);
                  return stages.slice(0,index).every(previous => ['Završeno','Nije potrebno'].includes(row.record.stages?.[previous]?.status)) &&
                    !['Završeno','Nije potrebno'].includes(stage.status) && !stage.workCenter;
                });
                if (!stageName) return null;
                const stage = row.record.stages?.[stageName] || blankStage();
                return <article className="production-station-job" key={row.key + stageName}>
                  <strong>{row.order.id} · {row.label} #{row.unitIndex}</strong>
                  <span>{row.material} · {row.piece.length} × {row.piece.width} × {row.piece.thickness} cm</span>
                  <small className={'production-station-status status-' + stage.status.toLowerCase().replaceAll(' ','-')}>{stage.status} · {stage.assignedTo || 'Radnik nije dodijeljen'}</small>
                  {stage.plannedStart && <small className="production-station-status">Termin: {formatDate(stage.plannedStart)}{stage.plannedEnd ? ' – ' + new Date(stage.plannedEnd).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'}) : ''}{stage.scheduledMachine ? ' · ' + stage.scheduledMachine : ''}</small>}
                  <div className="production-station-actions">
                    <button type="button" className="button button-secondary" onClick={() => { setExpandedOrders(current => ({...current,[row.order.id]:true})); setExpandedUnits(current => ({...current,[row.key]:true})); }}>Otvori fazu</button>
                    {stage.status === 'U tijeku' && <button type="button" className="button button-success" onClick={() => finishStage(row.key,stageName)}><Check size={14}/> Gotovo</button>}
                  </div>
                </article>;
              }) : <p className="production-saw-empty">Nema spremnih poslova.</p>}
            </section>;
          })}
        </div>
        <small className="production-saw-footnote">Posao se prikazuje kada su prethodne faze završene ili označene kao nepotrebne. Odabir radnog centra i odgovornog radnika uređuje se u detaljima faze.</small>
      </section>
      <div className="warehouse-toolbar production-toolbar">
        <label className="warehouse-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Traži nalog, kupca, projekt ili komad..."/></label>
        <label className="warehouse-filter"><span>Radnik</span><select value={selectedWorker} onChange={event => setSelectedWorker(event.target.value)}><option value="">Svi radnici</option>{(records.workers || []).map(worker => <option key={worker} value={worker}>{worker}</option>)}</select></label>
        <label className="warehouse-filter"><span>Prikaz</span><select value={filter} onChange={event => setFilter(event.target.value)}><option>Aktivni</option><option>U tijeku</option><option>Zastoj</option><option>Kontrola</option><option>Završeni</option><option>Svi</option></select></label>
      </div>
      <div className="production-groups">
        {groups.map(({ order, rows: orderRows }) => {
          const expanded = expandedOrders[order.id] !== false;
          const doneCount = orderRows.filter(row => unitProgress(row.record) === 100 && row.record.quality.status === 'Prošlo').length;
          return <article className="production-order-group" key={order.id}>
            <button className="production-group-head" onClick={() => setExpandedOrders(current => ({ ...current, [order.id]: !expanded }))} aria-expanded={expanded}>
              <span className="production-order-ref">{order.id}</span><span className="production-order-main"><strong>{order.project || 'Projekt bez naziva'}</strong><small>{order.customer} · {order.material || 'Materijal nije naveden'}</small></span>
              <span className="production-order-count">{orderRows.length} kom.</span><span className="production-order-progress">{doneCount}/{orderRows.length} gotovo</span><span className="production-chevron">{expanded ? '−' : '+'}</span>
            </button>
            {expanded && <div className="production-units">
              {orderRows.map(row => {
                const record = row.record;
                const progress = unitProgress(record);
                const unitExpanded = expandedUnits[row.key] === true;
                return <article className="production-unit-card" key={row.key}>
                  <button className="production-unit-head" onClick={() => setExpandedUnits(current => ({ ...current, [row.key]: !unitExpanded }))} aria-expanded={unitExpanded}>
                    <span className="production-unit-number">#{row.unitIndex}</span>
                    <span className="production-unit-title"><strong>{row.label}</strong><small>{row.material} · {row.piece.length} × {row.piece.width} × {row.piece.thickness} cm</small><small className="production-unit-hint">Otvori za faze obrade i kontrolu</small></span>
                    <span className="production-unit-progress"><i><b style={{ width: progress + '%' }}/></i>{progress}%</span>
                    <span className={'production-quality-pill quality-' + record.quality.status.toLowerCase().replaceAll(' ', '-')}>{record.quality.status}</span>
                  </button>
                  {unitExpanded && <div className="production-unit-body">
                    <div className="production-stage-grid production-stage-grid-detailed">
                      {stages.map((stageName, index) => {
                        const stage = record.stages?.[stageName] || blankStage();
                        const duration = elapsedMs(stage, clockNow);
                        return <section className={'production-stage-card stage-' + stage.status.toLowerCase().replaceAll(' ', '-')} key={stageName}>
                          <div className="production-stage-title"><span>{String(index + 1).padStart(2, '0')}</span><strong>{stageName}</strong><b>{stage.status}</b></div>
                          <label className="production-worker-field"><UserRound size={14}/><input list="production-worker-list" value={stage.assignedTo || ''} onChange={event => setStageWorker(row.key, stageName, event.target.value)} placeholder="Odgovorni radnik"/></label>
                          <label className="production-equipment-field"><Factory size={14}/><select aria-label={'Stroj za fazu ' + stageName} value={stage.equipmentId || ''} onChange={event => updateStage(row.key, stageName, previous => ({ ...previous, equipmentId: event.target.value }))}><option value="">Bez odabira stroja (nije obavezno)</option>{equipment.filter(item => item.status !== 'Izvan pogona').map(item => <option key={item.id} value={item.id}>{item.name}{item.location ? ' · ' + item.location : ''}</option>)}</select></label>
                          {(stageName === 'Poliranje' || stageName === 'Ostala obrada') && <label className="production-equipment-field"><Factory size={14}/><select aria-label={'Radni centar za fazu ' + stageName} value={stage.workCenter || ''} onChange={event => updateStage(row.key, stageName, previous => ({ ...previous, workCenter: event.target.value }))}><option value="">Odaberi radni centar</option>{(stageName === 'Poliranje' ? ['Polirka za šmuse i okapnice','Vanjska polirka za ravne spomenike i obloge'] : ['Ručna obrada','Terenski rad / montaža grobnica']).map(center => <option key={center} value={center}>{center}</option>)}</select></label>}
                          <div className="production-time-row"><Timer size={14}/><span>{formatDuration(duration)}</span>{stage.startedAt && <small>Početak: {formatDate(stage.startedAt)}</small>}</div>
                          {stage.equipmentId && <small className="production-equipment-runtime">Evidentirano korištenje: {equipment.find(item => item.id === stage.equipmentId)?.name || 'Stroj iz registra'} · {formatDuration(duration)} aktivnog vremena faze</small>}
                          {stage.status === 'Zastoj' && <p className="production-block-reason"><AlertTriangle size={13}/>{stage.blockedReason}</p>}
                          {stage.note && <p className="production-stage-note">{stage.note}</p>}
                          <div className="production-stage-actions">
                            {stage.status !== 'Završeno' && stage.status !== 'Nije potrebno' && stage.status !== 'U tijeku' && <button className="button button-primary" onClick={() => startStage(row.key, stageName)}><Play size={13}/>{stage.status === 'U tijeku' ? 'U tijeku' : 'Pokreni / nastavi'}</button>}
                            {stage.status === 'U tijeku' && <button className="button button-warning" onClick={() => stopStage(row.key, stageName)}><Pause size={13}/> Zastoj</button>}
                            {stage.status === 'U tijeku' && <button className="button button-success" onClick={() => finishStage(row.key, stageName)}><Check size={13}/> Završi</button>}
                            {stage.status === 'Nije započeto' && <button className="button button-ghost" onClick={() => markNotRequired(row.key, stageName)}>Nije potrebno</button>}
                            {stage.status === 'Nije potrebno' && <button className="button button-ghost" onClick={() => resetStage(row.key, stageName, row.order.id)}><RotateCcw size={13}/> Vrati fazu</button>}
                            {stage.status === 'Završeno' && <button className="button button-ghost" onClick={() => resetStage(row.key, stageName, row.order.id)}><RotateCcw size={13}/> Ponovi fazu</button>}
                          </div>
                          <label className="production-note-field"><span>Napomena / detalj obrade</span><textarea value={stage.note || ''} onChange={event => setStageNote(row.key, stageName, event.target.value)} rows="2" placeholder="Npr. granulacija, rub, dimenzija nakon obrade..."/></label>
                          {stage.completedAt && <small className="production-completed-at">Završeno: {formatDate(stage.completedAt)}</small>}
                        </section>;
                      })}
                    </div>
                    <section className="production-quality-panel">
                      <div className="production-quality-heading"><div><span className="eyebrow">ZAVRŠNA KONTROLA</span><h3>Kontrola kvalitete komada</h3><p>Provjeri dimenzije, rubove, površinu i eventualna oštećenja prije izdavanja.</p></div><span className={'production-quality-pill quality-' + record.quality.status.toLowerCase().replaceAll(' ', '-')}>{record.quality.status}</span></div>
                      <div className="production-quality-fields">
                        <label><span>Kontrolu obavio</span><input value={record.quality.checkedBy || ''} onChange={event => updateQualityField(row.key, 'checkedBy', event.target.value)} placeholder="Ime i prezime"/></label>
                        <label className="quality-note-field"><span>Napomena kontrole</span><input value={record.quality.note || ''} onChange={event => updateQualityField(row.key, 'note', event.target.value)} placeholder="Opis rezultata ili nedostatka"/></label>
                      </div>
                      <div className="production-quality-actions">
                        <button className="button button-success" disabled={!stages.every(stageName => ['Završeno', 'Nije potrebno'].includes(record.stages?.[stageName]?.status))} onClick={() => updateQuality(row.key, 'Prošlo')}><CheckCircle2 size={15}/> Kontrola prošla</button>
                        <button className="button button-danger-light" disabled={!stages.every(stageName => ['Završeno', 'Nije potrebno'].includes(record.stages?.[stageName]?.status))} onClick={() => updateQuality(row.key, 'Neispravno')}><XCircle size={15}/> Vraćeno na doradu</button>
                        {record.quality.status !== 'Čeka kontrolu' && <button className="button button-ghost" onClick={() => updateQuality(row.key, 'Čeka kontrolu')}>Ponovi kontrolu</button>}
                      </div>
                      {record.quality.checkedAt && <small className="production-completed-at">Zadnja kontrola: {formatDate(record.quality.checkedAt)}{record.quality.checkedBy ? ' · ' + record.quality.checkedBy : ''}</small>}
                    </section>
                  </div>}
                </article>;
              })}
            </div>}
          </article>;
        })}
        {!groups.length && <div className="workorders-empty"><Factory size={28}/><strong>{rows.length ? 'Nema komada za odabrani prikaz' : 'Još nema komada u proizvodnji'}</strong><span>{rows.length ? 'Promijeni pretragu ili filter.' : 'Za početak projekta izradi radni nalog s kupcem, rokovima, materijalom, dimenzijama i količinama. Svaki komad automatski će postati proizvodni zadatak.'}</span>{!rows.length && <button className="button button-primary" onClick={onCreateProject}><UserPlus size={14}/> Izradi prvi projekt</button>}</div>}
      </div>
    </section>
    <div className="module-notice"><ClipboardCheck size={17}/><span>Vrijeme se računa iz zabilježenih radnih intervala; zastoj prekida aktivni interval, a nastavak otvara novi. Podaci ostaju u ovom pregledniku i nisu sinkronizirani između uređaja. Završetak kontrole kvalitete ne zatvara automatski radni nalog niti mijenja skladište.</span></div>
  </div>;
}
