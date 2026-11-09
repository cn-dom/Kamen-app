import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Search, MapPin, CalendarDays, Clock3, Users, CheckCircle2, X, Play, Flag, ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react';
import { findFieldCrewConflicts, normalizeFieldCrew, summarizeFieldWork, validateFieldJob, appendFieldEvent } from '../lib/field-work.js';

const KEY = 'kamen-app-field-work-v1';
const ORDER_KEY = 'kamen-app-work-orders-v1';
const PRODUCTION_KEY = 'kamen-app-production-stages-v1';
const seed = [];
const read = (key, fallback) => { try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const blank = { orderId:'', customer:'', project:'', location:'', date:'', startTime:'08:00', endTime:'16:00', crew:[], team:'', vehicle:'', materials:'', distanceKm:'', note:'' };
const steps = ['Planirano','Na putu','Na lokaciji','Montaža u tijeku','Završeno','Vraćeno'];

export default function FieldWorkModule({ onBack }) {
  const [jobs,setJobs] = useState(()=>read(KEY,seed));
  const [orders,setOrders] = useState(()=>read(ORDER_KEY,[]));
  const [workers,setWorkers] = useState(()=>read(PRODUCTION_KEY,{}).workers || []);
  const [workerRecords,setWorkerRecords] = useState(()=>read(PRODUCTION_KEY,{}));
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('Svi');
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState(blank);
  const [expanded,setExpanded] = useState('');
  const [error,setError] = useState('');
  useEffect(()=>{ try { window.localStorage.setItem(KEY,JSON.stringify(jobs)); } catch {} },[jobs]);
  const filtered = useMemo(()=>jobs.filter(j=>(filter==='Svi'||j.status===filter)&&(!query.trim()||[j.id,j.customer,j.project,j.location,j.orderId,j.team].some(v=>(v||'').toLowerCase().includes(query.toLowerCase())))),[jobs,filter,query]);
  const summary = useMemo(()=>summarizeFieldWork(jobs),[jobs]);
  const setField=(id,key,value)=>setJobs(prev=>prev.map(j=>j.id===id?{...j,[key]:value}:j));
  const timestamp=()=>new Date().toLocaleString('hr-HR',{hour:'2-digit',minute:'2-digit'});
  const advance=(job)=>{ const index=steps.indexOf(job.status); if(index<0||index>=steps.length-1)return; const next=steps[index+1]; const key=({'Na putu':'departure','Na lokaciji':'arrival','Montaža u tijeku':'workStart','Završeno':'workEnd','Vraćeno':'returnTime'})[next]; const at=new Date().toISOString(); setJobs(prev=>prev.map(j=>j.id===job.id?appendFieldEvent({...j,status:next,...(key?{[key]:timestamp()}:{})},next,at):j)); };
  const openForm=()=>{setOrders(read(ORDER_KEY,[]));const records=read(PRODUCTION_KEY,{});setWorkerRecords(records);setWorkers(records.workers||[]);setForm({...blank,date:new Date().toLocaleDateString('en-CA')});setError('');setShowForm(true);};
  const toggleCrew=name=>setForm(p=>({...p,crew:p.crew.includes(name)?p.crew.filter(item=>item!==name):[...p.crew,name]}));
  const create=e=>{
    e.preventDefault();
    const records=read(PRODUCTION_KEY,{});setWorkerRecords(records);
    const crew=form.crew.length?form.crew:form.team.split(/[,;]+/).map(v=>v.trim()).filter(Boolean);
    const candidate={...form,crew,team:crew.join(', ')};
    const validation=validateFieldJob(candidate,jobs,records);
    if(validation){setError(validation);return;}
    const nextNumber=Math.max(0,...jobs.map(j=>Number(String(j.id).split('-').at(-1))||0))+1;
    const id='TR-'+new Date().getFullYear()+'-'+String(nextNumber).padStart(3,'0');
    setJobs(prev=>[appendFieldEvent({...candidate,id,status:'Planirano',departure:'',arrival:'',workStart:'',workEnd:'',returnTime:'',events:[]},'Nalog kreiran'),...prev]);
    setExpanded(id);setForm(blank);setShowForm(false);setError('');
  };
  const linkOrder=id=>{const o=orders.find(x=>x.id===id);setForm(p=>({...p,orderId:o?.id||'',customer:o?.customer||p.customer,project:o?.project||p.project}));};
  return <div className="page-content field-page">
    <section className="welcome-row module-welcome"><div><div className="eyebrow"><span className="live-dot"/> PRIJEVOZ I MONTAŽA</div><h1>Terenski rad</h1><p className="subtitle">Planiraj montaže, sastavi ekipu i provjeri zauzetost radnika prije potvrde termina.</p></div><div className="workorders-actions"><button className="button button-secondary" onClick={onBack}><ArrowLeft size={15}/> Pregled</button><button className="button button-primary" onClick={openForm}><Plus size={17}/> Novi terenski nalog</button></div></section>
    <section className="field-stats">
      <article className="panel workorders-stat"><span className="workorders-stat-icon blue"><ClipboardList size={19}/></span><div><small>Ukupno naloga</small><strong>{summary.total}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon amber"><Clock3 size={19}/></span><div><small>Aktivni nalozi</small><strong>{summary.active}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon green"><CheckCircle2 size={19}/></span><div><small>Danas na terenu</small><strong>{summary.today}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon amber"><AlertTriangle size={19}/></span><div><small>Bez dodijeljene ekipe</small><strong>{summary.unassigned}</strong></div></article>
    </section>
    <section className="panel workorders-list-panel"><div className="workorders-list-head"><div><h2>Terenski nalozi</h2><p>Pregled lokacija, ekipa, termina i napredovanja montaže.</p></div><div className="workorders-filters"><label className="workorders-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Traži kupca, projekt ili lokaciju…"/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Svi</option>{steps.map(s=><option key={s}>{s}</option>)}</select></div></div>
    <div className="field-cards">{filtered.map(j=><article className="workorder-card" key={j.id}><button className="workorder-card-head field-card-head" onClick={()=>setExpanded(expanded===j.id?'':j.id)} aria-expanded={expanded===j.id}><span className="workorder-id">{j.id}</span><span className="workorder-status">{j.status}</span><span className="workorder-title">{j.project}</span><span className="workorder-customer"><Users size={14}/>{j.customer}</span><span className="workorder-material"><MapPin size={14}/>{j.location}</span><span className="workorder-due"><CalendarDays size={14}/>{j.date} · {j.startTime||'08:00'}–{j.endTime||'16:00'}</span></button>
    {expanded===j.id&&<div className="workorder-details"><div className="field-detail-grid"><div><small>POVEZANI RADNI NALOG</small><strong>{j.orderId||'Nije povezan'}</strong></div><div><small>EKIPA</small><strong>{normalizeFieldCrew(j).join(', ')||'Nije dodijeljena'}</strong></div><div><small>VOZILO</small><strong>{j.vehicle||'Nije određeno'}</strong></div><div><small>UKUPNA KILOMETRAŽA</small><strong>{j.distanceKm ? Number(j.distanceKm).toLocaleString('hr-HR') + ' km' : 'Nije unesena'}</strong></div><div><small>MATERIJAL / OPREMA</small><strong>{j.materials||'Nije uneseno'}</strong></div></div>
    <div className="field-timeline">{[['Polazak',j.departure],['Dolazak',j.arrival],['Početak montaže',j.workStart],['Završetak montaže',j.workEnd],['Povratak',j.returnTime]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value||'—'}</strong></div>)}</div>
    {j.note&&<p className="workorder-note"><strong>Napomena:</strong> {j.note}</p>}
    <details className="field-event-history"><summary>Povijest terenskog naloga ({(j.events||[]).length})</summary><ol>{(j.events||[]).map((event,index)=><li key={event.id||index}><strong>{event.type}</strong><small>{new Date(event.at).toLocaleString('hr-HR')}</small></li>)}</ol></details>
    <div className="field-actions"><strong>Sljedeći korak: {steps[Math.min(steps.indexOf(j.status)+1,steps.length-1)]}</strong><button className="button button-primary" disabled={j.status==='Vraćeno'} onClick={()=>advance(j)}>{j.status==='Planirano'?<Play size={15}/>:<Flag size={15}/>} {j.status==='Planirano'?'Evidentiraj polazak':j.status==='Na putu'?'Evidentiraj dolazak':j.status==='Na lokaciji'?'Početak montaže':j.status==='Montaža u tijeku'?'Završi montažu':'Evidentiraj povratak'}</button></div>
    </div>}</article>)}{!filtered.length&&<div className="workorders-empty"><Truck size={28}/><strong>Nema terenskih naloga</strong><span>Promijeni filter ili izradi novi terenski nalog.</span></div>}</div>
    <p className="workorders-footnote">Vremena se bilježe lokalno u pregledniku. Evidencija terenskog naloga ne skida automatski gotove proizvode sa zalihe; ugrađene količine evidentiraj zasebno u Skladište → Gotovi proizvodi.</p></section>
    {showForm&&<div className="workorders-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="workorders-modal" role="dialog" aria-modal="true"><div className="workorders-modal-head"><div><span className="eyebrow">TERENSKI NALOG</span><h2>Novi terenski rad</h2><p>Odredi datum, termin i članove ekipe. Sustav provjerava preklapanja.</p></div><button className="icon-button" onClick={()=>setShowForm(false)} aria-label="Zatvori"><X size={20}/></button></div><form onSubmit={create}><div className="workorders-form-grid">
      <label>Radni nalog<select value={form.orderId} onChange={e=>linkOrder(e.target.value)}><option value="">Bez povezanog naloga</option>{orders.filter(o=>o.status!=='Otkazan').map(o=><option key={o.id} value={o.id}>{o.id} · {o.project}</option>)}</select></label>
      <label>Kupac *<input value={form.customer} onChange={e=>setForm(p=>({...p,customer:e.target.value}))} required/></label><label>Projekt *<input value={form.project} onChange={e=>setForm(p=>({...p,project:e.target.value}))} required/></label><label>Datum *<input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} required/></label>
      <label>Početak *<input type="time" value={form.startTime} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))} required/></label><label>Završetak *<input type="time" value={form.endTime} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))} required/></label>
      <label>Lokacija / groblje *<input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Naziv groblja, adresa ili mjesto" required/></label>
      <label>Vozilo<input value={form.vehicle} onChange={e=>setForm(p=>({...p,vehicle:e.target.value}))} placeholder="Npr. kombi"/></label><label>Materijal i alat<input value={form.materials} onChange={e=>setForm(p=>({...p,materials:e.target.value}))} placeholder="Planirani materijal i oprema"/></label><label>Ukupna kilometraža (km)<input type="number" min="0" step="0.1" value={form.distanceKm} onChange={e=>setForm(p=>({...p,distanceKm:e.target.value}))} placeholder="Ukupna vožnja vozila"/></label>
    </div>
    <div className="field-crew-picker"><strong>Članovi terenske ekipe *</strong>{workers.length?<div className="field-crew-options">{workers.map(name=><label key={name}><input type="checkbox" checked={form.crew.includes(name)} onChange={()=>toggleCrew(name)}/><span>{name}</span></label>)}</div>:<label>Imena članova ekipe<input value={form.team} onChange={e=>setForm(p=>({...p,team:e.target.value}))} placeholder="Npr. Ivan, Marko"/></label>}<small>Jedan radnik ne može biti raspoređen na dva terenska posla u preklapajućem terminu.</small></div>
    <label className="workorders-note-label">Napomena<textarea rows="2" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/></label>{error&&<p className="workorders-error">{error}</p>}<div className="workorders-modal-footer"><button type="button" className="button button-secondary" onClick={()=>setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={15}/> Spremi nalog</button></div></form></section></div>}
  </div>;
}
