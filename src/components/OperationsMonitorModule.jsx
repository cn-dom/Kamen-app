import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Factory, Users, ArrowRight, UserCheck, UserX, MapPin, BriefcaseBusiness } from 'lucide-react';
import { analyzeWorkshopCapacity } from '../lib/workshopMonitor.js';
import { sparePartReorderSuggestions } from '../lib/maintenance.js';

const read = (key, fallback) => { try { const value = JSON.parse(window.localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } };

export default function OperationsMonitorModule({ onBack }) {
  const [snapshot, setSnapshot] = useState(() => ({
    orders: read('kamen-app-work-orders-v1', []),
    production: read('kamen-app-production-stages-v1', {}),
    materials: read('kamen-app-materials-v1', [])
  }));
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const refresh = () => {
    setSnapshot({
      orders: read('kamen-app-work-orders-v1', []),
      production: read('kamen-app-production-stages-v1', {}),
      materials: read('kamen-app-materials-v1', [])
    });
    setUpdatedAt(new Date());
  };
  useEffect(() => {
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const report = useMemo(() => analyzeWorkshopCapacity(snapshot.orders, snapshot.production), [snapshot]);
  const stages = report.stages;
  const reorderSuggestions = useMemo(() => sparePartReorderSuggestions(snapshot.materials), [snapshot.materials]);
  const visibleAlerts = [
    ...report.alerts,
    ...reorderSuggestions.map(item => ({
      id: item.id,
      severity: 'warning',
      title: item.name + (item.quantity <= 0 ? ' · NEMA NA ZALIHI' : ' · ISPOD MINIMUMA'),
      description: 'Na zalihi ' + item.quantity.toLocaleString('hr-HR') + ' ' + item.unit + ' (minimum ' + item.minimum.toLocaleString('hr-HR') + '). Prijedlog nabave: ' + item.suggestedQuantity.toLocaleString('hr-HR') + ' ' + item.unit + ' za ciljnu zalihu ' + item.target.toLocaleString('hr-HR') + (item.location ? ' · ' + item.location : '') + '.',
      destination: 'Skladište'
    }))
  ];
  return <div className="page-content module-page">
    <section className="welcome-row module-welcome">
      <div>
        <div className="eyebrow"><span className="live-dot"/> PAMETNI NADZOR RADIONICE</div>
        <h1>AI nadzor poslovanja</h1>
        <p className="subtitle">Pozadinsko praćenje proizvodnje, opterećenja faza i današnje prisutnosti radnika.</p>
      </div>
      <div className="welcome-actions">
        <button className="button button-secondary" onClick={onBack}>← Pregled</button>
        <button className="button button-secondary" onClick={refresh}><Activity size={15}/> Osvježi podatke</button>
      </div>
    </section>

    <section className="stats-grid" aria-label="Pokazatelji radionice">
      <article className="stat-card"><div className="stat-top"><span>Radnici danas prisutni</span><span className="stat-icon blue-icon"><UserCheck size={18}/></span></div><div className="stat-value">{report.presentWorkers.length}<span className="stat-unit">osoba</span></div><div className="stat-foot"><span>{report.unrecordedWorkers.length} bez evidencije · {report.absentWorkers.length} odsutno</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Na terenu</span><span className="stat-icon amber-icon"><MapPin size={18}/></span></div><div className="stat-value">{report.fieldWorkers.length}<span className="stat-unit">osoba</span></div><div className="stat-foot"><span>Izvan kapaciteta radionice</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Na aktivnom poslu</span><span className="stat-icon purple-icon"><Factory size={18}/></span></div><div className="stat-value">{report.activeWorkers}<span className="stat-unit">osoba</span></div><div className="stat-foot"><span>Prema aktivnim dodjelama faza</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Prisutni bez dodjele</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{report.idleWorkers.length}<span className="stat-unit">osoba</span></div><div className="stat-foot"><span>Provjeriti raspored i sljedeće zadatke</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Komadi u aktivnim nalozima</span><span className="stat-icon green-icon"><Activity size={18}/></span></div><div className="stat-value">{report.summary.activePieces}<span className="stat-unit">komada</span></div><div className="stat-foot"><span>{report.summary.activeOrders} aktivnih naloga</span></div></article>
    </section>

    <section className="main-grid">
      <article className="panel orders-panel">
        <div className="panel-heading"><div><h2>Upozorenja i prijedlozi</h2><p>Zaključci iz proizvodnje, prisutnosti, održavanja i zaliha rezervnih dijelova.</p></div><span className="count-pill">{visibleAlerts.length}</span></div>
        {visibleAlerts.length ? <div className="alert-list">{visibleAlerts.map(alert => <div className="alert-row" key={alert.id}>
          <span className={'alert-dot '+(alert.severity === 'warning' ? 'amber' : 'blue')}/><div className="alert-row-copy"><strong>{alert.title}</strong><p>{alert.description}</p></div>
          <button className="row-action" onClick={onBack} title="Otvori pregled"><ArrowRight size={15}/></button>
        </div>)}</div> : <div className="empty-state"><CheckCircle2 size={22}/><strong>Nema aktivnih upozorenja</strong><span>Proizvodnja, prisutnost i označene zalihe rezervnih dijelova trenutačno ne traže intervenciju.</span></div>}
      </article>
      <article className="panel inventory-panel">
        <div className="panel-heading"><div><h2>Opterećenje po fazama</h2><p>Stanje pojedinačnih komada, ne samo naloga.</p></div></div>
        <div className="inventory-list">{stages.map(stage => <div className="inventory-item" key={stage.stage}>
          <div className="material-info"><strong>{stage.stage}</strong><small>{stage.inProgress} u tijeku · {stage.waiting} spremno za početak · {stage.blockedByPrevious} čeka prethodnu fazu</small></div>
          <div className="stock-right"><strong>{stage.inProgress + stage.waiting}</strong><span className="stock-status">{stage.inProgress ? 'Aktivno' : stage.waiting ? 'Čeka početak' : 'Bez aktivnosti'}</span></div>
        </div>)}</div>
      </article>
    </section>

    <section className="panel" style={{padding:22,marginTop:20}}>
      <div className="panel-heading"><div><h2>Prijedlozi rasporeda prema vještinama</h2><p>Sustav uspoređuje spremne komade, evidentirane vještine i prisutne radnike. Ne dodjeljuje poslove automatski.</p></div><span className="count-pill">{report.recommendations.length}</span></div>
      {report.recommendations.length ? <div className="skill-recommendations">{report.recommendations.map(item => <article key={item.stage}><div><strong>{item.stage}</strong><span>{item.waiting} komada čeka početak</span></div><p>Radnici s odgovarajućom vještinom: <b>{item.workers.join(', ')}</b></p>{item.examples.length > 0 && <small>Primjer: {item.examples.map(row => row.orderId + ' · ' + row.label + ' #' + row.unitIndex).join(' / ')}</small>}</article>)}</div> : <div className="empty-state"><CheckCircle2 size={20}/><strong>Nema potvrđenih prijedloga</strong><span>Provjeri jesu li radnici prisutni, u radionici i imaju li unesene vještine koje odgovaraju fazama koje čekaju.</span></div>}
    </section>

    <section className="panel" style={{padding:22,marginTop:20}}>
      <div className="panel-heading"><div><h2>Evidencija radnika za danas</h2><p>Ovo je stvarni temelj za procjenu raspoloživog kapaciteta.</p></div></div>
      <div className="quick-actions">
        {report.workers.length ? report.workers.map(name => {
          const status = report.presentWorkers.includes(name) ? 'Prisutan' : report.absentWorkers.includes(name) ? 'Odsutan' : report.offShiftWorkers.includes(name) ? 'Izvan smjene' : 'Nije evidentirano';
          const field = report.fieldWorkers.find(worker => worker.name === name);
          return <div key={name} className="monitor-worker-row">
            {field ? <MapPin size={17}/> : status === 'Prisutan' ? <UserCheck size={17}/> : <UserX size={17}/>}<strong>{name}</strong>
            <span className={'stock-status '+(field ? 'warn' : status === 'Prisutan' ? 'good' : status === 'Odsutan' ? 'warn' : '')}>{field ? 'Na terenu' : status}</span>
            {field && <small>{[field.task, field.location].filter(Boolean).join(' · ') || 'Terenski posao nije opisan'}</small>}
            {!field && status === 'Prisutan' && <small>Radionica</small>}
          </div>;
        }) : <div className="empty-state"><Users size={20}/><strong>Nema evidentiranih radnika</strong><span>Dodaj radnike u modulu Proizvodnja.</span></div>}
      </div>
      <p className="subtitle" style={{fontSize:12,marginTop:14}}>Prisutnost i mjesto rada vode se odvojeno za današnji datum. Radnici na terenu prikazuju se zasebno i ne ulaze u raspoloživi kapacitet radionice.</p>
      <div className="monitor-field-summary">
        <div className="panel-heading"><div><h3><BriefcaseBusiness size={16}/> Terenski raspored</h3><p>Aktivni terenski zadaci evidentirani za danas.</p></div><span className="count-pill">{report.fieldWorkers.length}</span></div>
        {report.fieldWorkers.length ? <div className="monitor-field-list">{report.fieldWorkers.map(worker => <article key={worker.name}><strong>{worker.name}</strong><span>{worker.task || 'Vrsta posla nije unesena'}</span><small><MapPin size={13}/>{worker.location || 'Lokacija nije unesena'}</small></article>)}</div> : <p className="subtitle" style={{fontSize:12}}>Trenutačno nema radnika označenih za teren.</p>}
      </div>
      <small style={{color:'var(--muted,#718096)'}}>Zadnje osvježavanje: {updatedAt.toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} · Podaci ostaju u ovom pregledniku.</small>
    </section>
  </div>;
}
