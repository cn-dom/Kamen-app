import React, { useEffect, useMemo, useState } from 'react';
import { Factory, Search, ClipboardCheck, Clock3, CheckCircle2, Hammer } from 'lucide-react';

const ORDERS_KEY = 'kamen-app-work-orders-v1';
const PRODUCTION_KEY = 'kamen-app-production-stages-v1';
const stages = ['Pilanje', 'Kanterica / obrada rubova', 'Poliranje', 'Ostala obrada', 'Završna kontrola'];
const statuses = ['Nije započeto', 'U tijeku', 'Završeno', 'Nije potrebno'];

function readJson(key, fallback) {
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

export default function ProductionModule({ onBack }) {
  const [orders, setOrders] = useState(() => readJson(ORDERS_KEY, []));
  const [records, setRecords] = useState(() => readJson(PRODUCTION_KEY, {}));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Aktivni');
  useEffect(() => { try { window.localStorage.setItem(PRODUCTION_KEY, JSON.stringify(records)); } catch { /* Browser storage unavailable. */ } }, [records]);
  useEffect(() => {
    const refresh = () => setOrders(readJson(ORDERS_KEY, []));
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const activeOrders = orders.filter(order => order.status !== 'Završen');
  const visible = useMemo(() => orders.filter(order => {
    const matches = [order.id, order.project, order.customer, order.material].join(' ').toLowerCase().includes(query.toLowerCase());
    return matches && (filter === 'Svi' || (filter === 'Aktivni' && order.status !== 'Završen') || (filter === 'Završeni' && order.status === 'Završen'));
  }), [orders, query, filter]);
  const getStage = (orderId, stage) => records[orderId]?.[stage] || 'Nije započeto';
  const updateStage = (orderId, stage, status) => setRecords(current => ({
    ...current,
    [orderId]: { ...(current[orderId] || {}), [stage]: status, updatedAt: new Date().toISOString() }
  }));
  const completedStages = Object.values(records).reduce((sum, row) => sum + stages.filter(stage => row[stage] === 'Završeno' || row[stage] === 'Nije potrebno').length, 0);
  const inProgress = Object.values(records).reduce((sum, row) => sum + stages.filter(stage => row[stage] === 'U tijeku').length, 0);

  return <div className="page-content module-page production-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> RADIONICA I OBRADA</div><h1>Proizvodnja</h1><p className="subtitle">Prati svaki radni nalog kroz pilanje, obradu rubova, poliranje i završnu kontrolu. Status svake faze vodi se zasebno.</p></div>
      <div className="welcome-actions"><button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button></div>
    </section>
    <section className="stats-grid warehouse-stats">
      <article className="stat-card"><div className="stat-top"><span>Aktivni nalozi</span><span className="stat-icon blue-icon"><Factory size={18}/></span></div><div className="stat-value">{activeOrders.length}<span className="stat-unit">naloga</span></div><div className="stat-foot">U proizvodnom procesu</div></article>
      <article className="stat-card"><div className="stat-top"><span>Faze u tijeku</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{inProgress}<span className="stat-unit">faza</span></div><div className="stat-foot">Trenutačno aktivne obrade</div></article>
      <article className="stat-card"><div className="stat-top"><span>Završene faze</span><span className="stat-icon green-icon"><CheckCircle2 size={18}/></span></div><div className="stat-value">{completedStages}<span className="stat-unit">faza</span></div><div className="stat-foot">U svim evidentiranim nalozima</div></article>
      <article className="stat-card"><div className="stat-top"><span>Ukupno naloga</span><span className="stat-icon violet-icon"><ClipboardCheck size={18}/></span></div><div className="stat-value">{orders.length}<span className="stat-unit">naloga</span></div><div className="stat-foot">Povezano s radnim nalozima</div></article>
    </section>
    <section className="panel warehouse-panel">
      <div className="panel-heading"><div><h2>Proizvodni nalozi</h2><p>Odaberi status svake faze. Promjene se čuvaju u ovom pregledniku.</p></div><span className="demo-label"><span/> LOKALNA EVIDENCIJA</span></div>
      <div className="warehouse-toolbar"><label className="warehouse-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži nalog, kupca ili projekt..."/></label><label className="warehouse-filter"><span>Prikaz</span><select value={filter} onChange={e => setFilter(e.target.value)}><option>Aktivni</option><option>Svi</option><option>Završeni</option></select></label></div>
      <div className="workorders-cards">
        {visible.map(order => {
          const done = stages.filter(stage => ['Završeno', 'Nije potrebno'].includes(getStage(order.id, stage))).length;
          const progress = Math.round(done / stages.length * 100);
          return <article className="workorder-card" key={order.id}>
            <div className="workorder-card-head production-order-head"><span className="workorder-id">{order.id}</span><span className="workorder-status">{order.status}</span><strong className="workorder-title">{order.project}</strong><span className="workorder-customer">{order.customer}</span><span className="workorder-material">{order.material}</span></div>
            <div className="workorder-details">
              <div className="workorder-detail-top"><div><strong>Napredak proizvodnje</strong><p>{done} od {stages.length} faza završeno · {progress}%</p><div className="progress-track"><span style={{width: progress + '%'}}/></div></div><span className="workorder-id">{order.due || 'Rok nije određen'}</span></div>
              <div className="production-stage-grid">{stages.map((stage, index) => <label className="production-stage" key={stage}><span><b>0{index + 1}</b>{stage}</span><select value={getStage(order.id, stage)} onChange={event => updateStage(order.id, stage, event.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>)}</div>
              <div className="workorder-card-footer"><span><Hammer size={15}/> {order.pieces?.length || 0} vrsta komada · {order.pieces?.reduce((sum, piece) => sum + Number(piece.quantity || 0), 0) || 0} komada ukupno</span><span className="muted-icon">Zadnja promjena: {records[order.id]?.updatedAt ? new Date(records[order.id].updatedAt).toLocaleString('hr-HR') : 'Još nije mijenjano'}</span></div>
            </div>
          </article>;
        })}
        {!visible.length && <div className="workorders-empty"><Factory size={28}/><strong>{orders.length ? 'Nema naloga za odabrani prikaz' : 'Još nema radnih naloga'}</strong><span>{orders.length ? 'Promijeni pretragu ili filter.' : 'Najprije izradi radni nalog u modulu Radni nalozi. Ovdje će se automatski prikazati.'}</span></div>}
      </div>
    </section>
    <div className="module-notice"><ClipboardCheck size={17}/><span>Faze proizvodnje zasad se spremaju lokalno u ovom pregledniku. Evidencija je operativna, ali još nije sinkronizirana među korisnicima i uređajima. Pilanje materijala i povezivanje izlaznih komada i dalje se evidentira kroz skladišnu funkciju pilanja.</span></div>
  </div>;
}
