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
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [newWorker, setNewWorker] = useState('');
  const [clockNow, setClockNow] = useState(Date.now());

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
    const stageIndex = stages.indexOf(stageName);
    if (stages.slice(0, stageIndex).some(previousStage => !['Završeno', 'Nije potrebno'].includes(unit.stages?.[previousStage]?.status))) {
      window.alert('Najprije završi prethodnu fazu obrade ili je označi kao nije potrebnu.');
      return;
    }
    updateStage(key, stageName, previous => {
    const now = new Date().toISOString();
    return { ...previous, status: 'U tijeku', startedAt: previous.startedAt || now, completedAt: null, blockedReason: '', sessions: [...(previous.sessions || []), { startedAt: now, endedAt: null }] };
    });
  };
  const stopStage = (key, stageName) => {
    const reason = window.prompt('Upiši razlog zastoja. Primjer: kvar stroja, čekanje materijala, promjena nacrta.');
    if (!reason?.trim()) return;
    updateStage(key, stageName, previous => {
      if (previous.status !== 'U tijeku') return previous;
      const sessions = [...(previous.sessions || [])];
      let open = sessions.length - 1;
      while (open >= 0 && sessions[open].endedAt) open -= 1;
      if (open >= 0) sessions[open] = { ...sessions[open], endedAt: new Date().toISOString() };
      return { ...previous, status: 'Zastoj', blockedReason: reason.trim(), sessions };
    });
  };
  const finishStage = (key, stageName) => updateStage(key, stageName, previous => {
    if (previous.status !== 'U tijeku') return previous;
    const now = new Date().toISOString();
    const sessions = [...(previous.sessions || [])];
    let open = sessions.length - 1;
    while (open >= 0 && sessions[open].endedAt) open -= 1;
    if (open >= 0) sessions[open] = { ...sessions[open], endedAt: now };
    return { ...previous, status: 'Završeno', completedAt: now, blockedReason: '', sessions };
  });
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
    return matchesQuery && matchesFilter && row.order.status !== 'Otkazan';
  }), [rowsWithRecords, query, filter]);
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
            </div>}
          </article>;
        })}{!(records.workers || []).length && <small>Još nema unesenih radnika. Ime se može upisati i izravno u fazi.</small>}</div>
<p className="production-attendance-note">Prisutnost i raspored vode se odvojeno za današnji datum. Radnik na terenu nije slobodan kapacitet radionice.</p>
        <datalist id="production-worker-list">{(records.workers || []).map(worker => <option key={worker} value={worker}/>)}</datalist></div></details>
      </section>
      <div className="warehouse-toolbar production-toolbar">
        <label className="warehouse-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Traži nalog, kupca, projekt ili komad..."/></label>
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
