import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, Clock3, UserRound, Wrench, AlertTriangle, CheckCircle2, Trash2, Pencil, X, Printer } from 'lucide-react';
import { PRODUCTION_STAGES, buildProductionUnits } from '../lib/production.js';

const KEY = 'kamen-app-schedule-v1';
const ORDERS_KEY = 'kamen-app-work-orders-v1';
const PRODUCTION_KEY = 'kamen-app-production-stages-v1';
const EQUIPMENT_KEY = 'kamen-app-schedule-equipment-v1';
const read = (key, fallback) => { try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const localDate = date => { const d = new Date(date); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); };
const mondayOf = date => { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d; };
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate()+days); return d; };
const hoursBetween = (start,end) => Math.max(0,(new Date(end)-new Date(start))/3600000);
const overlaps = (a,b,c,d) => new Date(a)<new Date(d) && new Date(c)<new Date(b);
const emptyForm = () => ({ pieceKey:'', stage:PRODUCTION_STAGES[0], worker:'', machine:'', start:'', end:'', priority:'Normalan', status:'Planirano', note:'' });
const dateTime = (date, hour='08:00') => date + 'T' + hour;
const formatTime = value => new Date(value).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'});
const formatDate = value => new Date(value+'T12:00:00').toLocaleDateString('hr-HR',{weekday:'short',day:'numeric',month:'short'});

export default function ScheduleModule({ onBack }) {
  const [tasks,setTasks] = useState(()=>read(KEY,[]));
  const [orders] = useState(()=>read(ORDERS_KEY,[]));
  const [production] = useState(()=>read(PRODUCTION_KEY,{}));
  const [workers] = useState(()=>read(PRODUCTION_KEY,{}).workers || []);
  const [equipment,setEquipment] = useState(()=>read(EQUIPMENT_KEY,['Mostna pila','Kanterica','Polirka','Radni stol','CNC stroj']));
  const [weekStart,setWeekStart] = useState(()=>mondayOf(new Date()));
  const [view,setView] = useState('Tjedan');
  const [filter,setFilter] = useState('Svi');
  const [query,setQuery] = useState('');
  const [showForm,setShowForm] = useState(false);
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState(emptyForm);
  const [error,setError] = useState('');
  const [newMachine,setNewMachine] = useState('');
  const units = useMemo(()=>buildProductionUnits(orders),[orders]);
  const unitOptions = units.filter(unit=>!['Završen','Otkazan'].includes(unit.order.status));
  const saveTasks = next => { setTasks(next); try { window.localStorage.setItem(KEY,JSON.stringify(next)); } catch { setError('Nema dovoljno prostora za spremanje rasporeda. Izradi sigurnosnu kopiju i oslobodi prostor.'); } };
  const weekDays = Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const rangeStart = localDate(weekStart), rangeEnd = localDate(addDays(weekStart,6));
  const weekTasks = tasks.filter(task=>task.start?.slice(0,10)>=rangeStart && task.start?.slice(0,10)<=rangeEnd);
  const visibleTasks = weekTasks.filter(task=>(filter==='Svi'||task.status===filter) && (!query.trim() || [task.orderId,task.project,task.customer,task.pieceLabel,task.worker,task.machine,task.stage].join(' ').toLocaleLowerCase('hr').includes(query.trim().toLocaleLowerCase('hr'))));
  const today = localDate(new Date());
  const todayTasks = tasks.filter(task=>task.start?.slice(0,10)===today && task.status!=='Otkazano');
  const plannedHours = weekTasks.filter(task=>task.status!=='Otkazano').reduce((sum,task)=>sum+hoursBetween(task.start,task.end),0);
  const openForm = task => {
    setError('');
    setEditing(task?.id || null);
    setForm(task ? { pieceKey:task.pieceKey||'',stage:task.stage||PRODUCTION_STAGES[0],worker:task.worker||'',machine:task.machine||'',start:task.start?.slice(0,16)||'',end:task.end?.slice(0,16)||'',priority:task.priority||'Normalan',status:task.status||'Planirano',note:task.note||'' } : {...emptyForm(),start:dateTime(today),end:dateTime(today,'10:00')});
    setShowForm(true);
  };
  const saveTask = event => {
    event.preventDefault(); setError('');
    const unit=units.find(item=>item.key===form.pieceKey);
    if (!unit) { setError('Odaberi komad iz postojećeg radnog naloga.'); return; }
    if (!form.worker.trim()) { setError('Odaberi odgovornog radnika.'); return; }
    if (!form.machine.trim()) { setError('Odaberi radno mjesto ili stroj.'); return; }
    if (!form.start || !form.end || new Date(form.end)<=new Date(form.start)) { setError('Vrijeme završetka mora biti nakon početka.'); return; }
    const conflict=tasks.find(task=>task.id!==editing && task.status!=='Otkazano' && overlaps(form.start,form.end,task.start,task.end) && ((task.worker && task.worker===form.worker.trim()) || (task.machine && task.machine===form.machine.trim())));
    if (conflict) { setError('Sukob rasporeda: '+(conflict.worker===form.worker.trim()?'radnik '+form.worker:'stroj '+form.machine)+' već je zauzet u terminu '+formatTime(conflict.start)+'–'+formatTime(conflict.end)+'.'); return; }
    const task={id:editing||('RAS-'+Date.now()),pieceKey:unit.key,orderId:unit.order.id,project:unit.order.project||unit.order.title||'Radni nalog',customer:unit.order.customer||'',pieceLabel:unit.label+' · komad '+unit.unitIndex,material:unit.material,stage:form.stage,worker:form.worker.trim(),machine:form.machine.trim(),start:new Date(form.start).toISOString(),end:new Date(form.end).toISOString(),priority:form.priority,status:form.status,note:form.note.trim(),updatedAt:new Date().toISOString()};
    saveTasks(editing?tasks.map(item=>item.id===editing?task:item):[...tasks,task]);
    setShowForm(false);setEditing(null);setForm(emptyForm());
  };
  const removeTask = task => { if(!window.confirm('Obrisati planiranu aktivnost '+task.orderId+' – '+task.pieceLabel+'?')) return; saveTasks(tasks.filter(item=>item.id!==task.id)); };
  const updateStatus = (task,status) => saveTasks(tasks.map(item=>item.id===task.id?{...item,status,updatedAt:new Date().toISOString()}:item));
  const addMachine = event => { event.preventDefault(); const name=newMachine.trim(); if(!name||equipment.some(item=>item.toLocaleLowerCase('hr')===name.toLocaleLowerCase('hr')))return; const next=[...equipment,name];setEquipment(next);try{window.localStorage.setItem(EQUIPMENT_KEY,JSON.stringify(next));}catch{}setNewMachine(''); };
  const removeMachine = name => { if(tasks.some(task=>task.machine===name && task.status!=='Otkazano')) { window.alert('Stroj se ne može ukloniti dok ima aktivnih planiranih aktivnosti.'); return; } const next=equipment.filter(item=>item!==name);setEquipment(next);try{window.localStorage.setItem(EQUIPMENT_KEY,JSON.stringify(next));}catch{} };
  const dayLabel = d => localDate(d);
  const dayTasks = date => visibleTasks.filter(task=>task.start.slice(0,10)===dayLabel(date)).sort((a,b)=>a.start.localeCompare(b.start));
  const statusClass = status => status==='Završeno'?'done':status==='U tijeku'?'active':status==='Otkazano'?'cancelled':'planned';
  const statusOptions=['Planirano','U tijeku','Završeno','Otkazano'];
  return <div className="page-content schedule-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> ORGANIZACIJA RADIONICE</div><h1>Raspored radionice</h1><p className="subtitle">Planiraj rad po komadu, zaduženom radniku i stroju. Sukobi termina provjeravaju se prije spremanja.</p></div>
      <div className="schedule-actions"><button className="button button-secondary" onClick={onBack}>← Pregled</button><button className="button button-primary" onClick={()=>openForm(null)}><Plus size={16}/> Nova aktivnost</button></div>
    </section>
    <section className="schedule-stats">
      <article className="panel"><span className="schedule-stat-icon blue"><CalendarDays size={18}/></span><div><small>Aktivnosti danas</small><strong>{todayTasks.length}</strong></div></article>
      <article className="panel"><span className="schedule-stat-icon violet"><Clock3 size={18}/></span><div><small>Planirani sati ovaj tjedan</small><strong>{plannedHours.toLocaleString('hr-HR',{maximumFractionDigits:1})} h</strong></div></article>
      <article className="panel"><span className="schedule-stat-icon green"><CheckCircle2 size={18}/></span><div><small>Završeno ovaj tjedan</small><strong>{weekTasks.filter(task=>task.status==='Završeno').length}</strong></div></article>
      <article className="panel"><span className="schedule-stat-icon amber"><Wrench size={18}/></span><div><small>Radna mjesta / strojevi</small><strong>{equipment.length}</strong></div></article>
    </section>
    <section className="panel schedule-workspace">
      <div className="schedule-toolbar">
        <div className="schedule-range"><button className="icon-button" onClick={()=>setWeekStart(addDays(weekStart,-7))} aria-label="Prethodni tjedan"><ChevronLeft size={18}/></button><button className="button button-secondary" onClick={()=>setWeekStart(mondayOf(new Date()))}>Danas</button><button className="icon-button" onClick={()=>setWeekStart(addDays(weekStart,7))} aria-label="Sljedeći tjedan"><ChevronRight size={18}/></button><strong>{formatDate(rangeStart)} – {formatDate(rangeEnd)}</strong></div>
        <div className="schedule-filters"><label className="schedule-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Traži nalog, radnika, stroj…"/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="Svi">Svi statusi</option>{statusOptions.map(status=><option key={status}>{status}</option>)}</select><button className="button button-secondary" onClick={()=>window.print()}><Printer size={15}/> Ispis</button></div>
      </div>
      <div className="schedule-week-grid">
        {weekDays.map(day=><section className={'schedule-day '+(dayLabel(day)===today?'is-today':'')} key={dayLabel(day)}>
          <header><span>{day.toLocaleDateString('hr-HR',{weekday:'short'}).toLocaleUpperCase('hr')}</span><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('hr-HR',{month:'short'})}</small></header>
          <div className="schedule-day-list">{dayTasks(day).map(task=><article className={'schedule-task '+statusClass(task.status)} key={task.id}>
            <div className="schedule-task-time">{formatTime(task.start)}–{formatTime(task.end)}</div><strong>{task.pieceLabel}</strong><span>{task.orderId} · {task.project}</span><div className="schedule-task-meta"><span><UserRound size={11}/>{task.worker}</span><span><Wrench size={11}/>{task.machine}</span></div><small>{task.stage}</small>
            <div className="schedule-task-actions"><select aria-label="Status aktivnosti" value={task.status} onChange={e=>updateStatus(task,e.target.value)}>{statusOptions.map(status=><option key={status}>{status}</option>)}</select><button onClick={()=>openForm(task)} title="Uredi"><Pencil size={13}/></button><button onClick={()=>removeTask(task)} title="Obriši"><Trash2 size={13}/></button></div>
          </article>)}
          {!dayTasks(day).length&&<div className="schedule-day-empty">Nema aktivnosti</div>}
          </div>
        </section>)}
      </div>
      <div className="schedule-legend"><span><i className="planned"/> Planirano</span><span><i className="active"/> U tijeku</span><span><i className="done"/> Završeno</span><span><i className="cancelled"/> Otkazano</span></div>
    </section>
    <section className="schedule-bottom-grid">
      <article className="panel schedule-resource-panel"><div className="schedule-section-heading"><div><h2>Radna mjesta i strojevi</h2><p>Prilagodi popis opremi u svojoj radionici.</p></div><Wrench size={18}/></div><form className="schedule-add-resource" onSubmit={addMachine}><input value={newMachine} onChange={e=>setNewMachine(e.target.value)} placeholder="Npr. pila za most, polirka…"/><button className="button button-secondary" type="submit"><Plus size={14}/> Dodaj</button></form><div className="schedule-resource-list">{equipment.map(name=><span key={name}>{name}<button onClick={()=>removeMachine(name)} aria-label={'Ukloni '+name}><X size={12}/></button></span>)}</div></article>
      <article className="panel schedule-resource-panel"><div className="schedule-section-heading"><div><h2>Raspoloživi radnici</h2><p>Popis se preuzima iz modula Proizvodnja.</p></div><UserRound size={18}/></div><div className="schedule-resource-list">{workers.length?workers.map(name=><span key={name}>{name}</span>):<p className="schedule-muted">Još nema unesenih radnika. Dodaj ih u modulu Proizvodnja.</p>}</div><p className="schedule-resource-note">Za sada se termini mogu dodijeliti upisanim radnicima. Raspored ne predstavlja evidenciju prijave na rad ili obračun plaće.</p></article>
    </section>
    {showForm&&<div className="schedule-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowForm(false);}}><form className="schedule-modal" onSubmit={saveTask}>
      <header><div><span className="eyebrow">PLANIRANJE PROIZVODNJE</span><h2>{editing?'Uredi aktivnost':'Nova aktivnost'}</h2><p>Odaberi fizički komad iz radnog naloga i dodijeli resurse.</p></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)} aria-label="Zatvori"><X size={18}/></button></header>
      <label className="schedule-field schedule-field-wide">Radni nalog / komad<select value={form.pieceKey} onChange={e=>{const unit=units.find(item=>item.key===e.target.value);setForm(current=>({...current,pieceKey:e.target.value,stage:PRODUCTION_STAGES.find(stage=>!['Završeno','Nije potrebno'].includes(production.pieces?.[e.target.value]?.stages?.[stage]?.status))||current.stage}));}} required><option value="">Odaberi komad…</option>{unitOptions.map(unit=><option key={unit.key} value={unit.key}>{unit.order.id} · {unit.order.project||unit.order.title} · {unit.label} #{unit.unitIndex} ({unit.material})</option>)}</select></label>
      <div className="schedule-form-grid"><label className="schedule-field">Faza obrade<select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{PRODUCTION_STAGES.map(stage=><option key={stage}>{stage}</option>)}</select></label><label className="schedule-field">Prioritet<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Nizak</option><option>Normalan</option><option>Visok</option><option>Hitno</option></select></label>
      <label className="schedule-field">Radnik<select value={form.worker} onChange={e=>setForm({...form,worker:e.target.value})} required><option value="">Odaberi radnika…</option>{workers.map(name=><option key={name}>{name}</option>)}</select></label><label className="schedule-field">Stroj / radno mjesto<select value={form.machine} onChange={e=>setForm({...form,machine:e.target.value})} required><option value="">Odaberi…</option>{equipment.map(name=><option key={name}>{name}</option>)}</select></label>
      <label className="schedule-field">Početak<input type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} required/></label><label className="schedule-field">Završetak<input type="datetime-local" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} required/></label>
      <label className="schedule-field">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statusOptions.map(status=><option key={status}>{status}</option>)}</select></label><label className="schedule-field schedule-field-wide">Napomena<textarea rows="3" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Posebne upute, priprema, napomena za smjenu…"/></label></div>
      {error&&<div className="schedule-error"><AlertTriangle size={16}/>{error}</div>}
      <footer><button type="button" className="button button-secondary" onClick={()=>setShowForm(false)}>Odustani</button><button className="button button-primary" type="submit"><CheckCircle2 size={15}/>{editing?'Spremi promjene':'Dodaj u raspored'}</button></footer>
    </form></div>}
    <p className="schedule-footnote">Raspored se sprema lokalno u ovom pregledniku. Planirani termini ne pokreću automatski štopericu u Proizvodnji; stvarni rad i dalje se evidentira u modulu Proizvodnja.</p>
  </div>;
}
