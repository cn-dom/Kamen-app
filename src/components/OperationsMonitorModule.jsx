import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Factory, Users, ArrowRight, UserCheck, UserX } from 'lucide-react';
import { analyzeWorkshopCapacity } from '../lib/workshopMonitor.js';

const read = (key, fallback) => { try { const value = JSON.parse(window.localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } };

export default function OperationsMonitorModule({ onBack }) {
  const [snapshot, setSnapshot] = useState(() => ({
    orders: read('kamen-app-work-orders-v1', []),
    production: read('kamen-app-production-stages-v1', {})
  }));
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const refresh = () => {
    setSnapshot({
      orders: read('kamen-app-work-orders-v1', []),
      production: read('kamen-app-production-stages-v1', {})
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
      <article className="stat-card"><div className="stat-top"><span>Na aktivnom poslu</span><span className="stat-icon purple-icon"><Factory size={18}/></span></div><div className="stat-value">{report.activeWorkers}<span className="stat-unit">osoba</span></div><div className="stat-foot"><span>Prema aktivnim dodjelama faza</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Prisutni bez dodjele</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{report.idleWorkers.length}<span className="stat-unit">osoba</span></div><div className="stat-foot"><span>Provjeriti raspored i sljedeće zadatke</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Komadi u aktivnim nalozima</span><span className="stat-icon green-icon"><Activity size={18}/></span></div><div className="stat-value">{report.summary.activePieces}<span className="stat-unit">komada</span></div><div className="stat-foot"><span>{report.summary.activeOrders} aktivnih naloga</span></div></article>
    </section>

    <section className="main-grid">
      <article className="panel orders-panel">
        <div className="panel-heading"><div><h2>Upozorenja i prijedlozi</h2><p>Zaključci iz naloga, faza i današnje evidencije prisutnosti.</p></div><span className="count-pill">{report.alerts.length}</span></div>
        {report.alerts.length ? <div className="alert-list">{report.alerts.map(alert => <div className="alert-row" key={alert.id}>
          <span className={'alert-dot '+(alert.severity === 'warning' ? 'amber' : 'blue')}/><div className="alert-row-copy"><strong>{alert.title}</strong><p>{alert.description}</p></div>
          <button className="row-action" onClick={onBack} title="Otvori pregled"><ArrowRight size={15}/></button>
        </div>)}</div> : <div className="empty-state"><CheckCircle2 size={22}/><strong>Nema otkrivenih uskih grla</strong><span>Potvrđena prisutnost i aktivne faze trenutačno ne pokazuju zastoj kapaciteta.</span></div>}
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
      <div className="panel-heading"><div><h2>Evidencija radnika za danas</h2><p>Ovo je stvarni temelj za procjenu raspoloživog kapaciteta.</p></div></div>
      <div className="quick-actions">
        {report.workers.length ? report.workers.map(name => {
          const status = report.presentWorkers.includes(name) ? 'Prisutan' : report.absentWorkers.includes(name) ? 'Odsutan' : report.offShiftWorkers.includes(name) ? 'Izvan smjene' : 'Nije evidentirano';
          return <div key={name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0'}}>
            {status === 'Prisutan' ? <UserCheck size={17}/> : <UserX size={17}/>}<strong>{name}</strong><span className={'stock-status '+(status === 'Prisutan' ? 'good' : status === 'Odsutan' ? 'warn' : '')}>{status}</span>
          </div>;
        }) : <div className="empty-state"><Users size={20}/><strong>Nema evidentiranih radnika</strong><span>Dodaj radnike u modulu Proizvodnja.</span></div>}
      </div>
      <p className="subtitle" style={{fontSize:12,marginTop:14}}>Prisutnost se unosi u modulu Proizvodnja i vrijedi samo za današnji datum. Ako nije evidentirana, sustav neće radnika računati kao prisutnog niti će ga proglasiti neiskorištenim.</p>
      <small style={{color:'var(--muted,#718096)'}}>Zadnje osvježavanje: {updatedAt.toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} · Podaci ostaju u ovom pregledniku.</small>
    </section>
  </div>;
}
