import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, Boxes, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Command, Factory, FileText, Filter, Hammer, LayoutDashboard,
  Menu, MoreHorizontal, Package, Plus, Search, Settings2, ShieldCheck,
  Truck, Users, Wallet, X, HardHat, ClipboardList, Layers3
} from 'lucide-react';
import './styles.css';

const initialOrders = [
  { id:'PR-2026-0042', title:'Obiteljska grobnica — Horvat', customer:'Obitelj Horvat', due:'Danas', date:'2026-10-27', stage:'Poliranje', progress:76, priority:'Visok', owner:'M. Kovač', color:'blue', material:'Brački kamen' },
  { id:'PR-2026-0041', title:'Nadgrobni spomenik — Marić', customer:'Ivan Marić', due:'Sutra', date:'2026-10-28', stage:'CNC obrada', progress:52, priority:'Normalan', owner:'D. Perić', color:'violet', material:'Impala granit' },
  { id:'PR-2026-0039', title:'Kuhinjska radna ploča', customer:'Studio Forma', due:'30. lis', date:'2026-10-30', stage:'Pilanje', progress:28, priority:'Normalan', owner:'A. Jurić', color:'amber', material:'Carrara mramor' },
  { id:'PR-2026-0037', title:'Stepenice i klupčice', customer:'Novogradnja d.o.o.', due:'2. stu', date:'2026-11-02', stage:'Kontrola kvalitete', progress:91, priority:'Nizak', owner:'M. Kovač', color:'green', material:'Brački kamen' },
  { id:'PR-2026-0036', title:'Vanjska obloga — vila', customer:'Projekt Adria', due:'4. stu', date:'2026-11-04', stage:'Čeka materijal', progress:12, priority:'Visok', owner:'D. Perić', color:'rose', material:'Travertin' }
];
const inventory = [
  {name:'Brački kamen', type:'Prirodni kamen', stock:'24,8 m²', state:'Dobra zaliha', tone:'good', icon:'stone'},
  {name:'Impala granit', type:'Granit', stock:'8,2 m²', state:'Niska zaliha', tone:'warn', icon:'granite'},
  {name:'Carrara mramor', type:'Mramor', stock:'3 ploče', state:'Niska zaliha', tone:'warn', icon:'marble'},
  {name:'Travertin', type:'Prirodni kamen', stock:'0,0 m²', state:'Nema zalihe', tone:'danger', icon:'travertine'}
];
const nav = [
  {label:'Pregled', icon:LayoutDashboard, section:'RADNI PROSTOR'},
  {label:'Radni nalozi', icon:ClipboardList, count:'12'},
  {label:'Proizvodnja', icon:Factory},
  {label:'Skladište', icon:Boxes, count:'4', alert:true},
  {label:'Terenski rad', icon:Truck},
  {label:'Kupci', icon:Users},
  {label:'Troškovi i izvještaji', icon:Wallet, section:'POSLOVANJE'},
];
const money = n => new Intl.NumberFormat('hr-HR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);

function App(){
  const [orders,setOrders] = useState(initialOrders);
  const [activeNav,setActiveNav] = useState('Pregled');
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('Svi nalozi');
  const [showCreate,setShowCreate] = useState(false);
  const [showAlerts,setShowAlerts] = useState(false);
  const [showProfile,setShowProfile] = useState(false);
  const [mobileNav,setMobileNav] = useState(false);
  const [toast,setToast] = useState('');
  const [newTitle,setNewTitle] = useState('');
  const [newCustomer,setNewCustomer] = useState('');
  const [newMaterial,setNewMaterial] = useState('Brački kamen');
  const [newDue,setNewDue] = useState('');
  const [showAllInventory,setShowAllInventory] = useState(false);
  const [completed,setCompleted] = useState([]);
  const filteredOrders = useMemo(()=>orders.filter(o=>{
    const q=query.trim().toLocaleLowerCase('hr');
    const matches=!q || [o.id,o.title,o.customer,o.stage,o.material].some(v=>v.toLocaleLowerCase('hr').includes(q));
    const status=filter==='Svi nalozi' || (filter==='Hitni'&&o.priority==='Visok') || (filter==='U tijeku'&&o.progress>0&&o.progress<100);
    return matches&&status;
  }),[orders,query,filter]);
  const notify = msg => {setToast(msg); window.setTimeout(()=>setToast(''),2600)};
  const createOrder = e => {
    e.preventDefault();
    if(!newTitle.trim()||!newCustomer.trim()){notify('Unesite naziv naloga i kupca.');return;}
    const id='PR-2026-'+String(43+orders.length-initialOrders.length).padStart(4,'0');
    setOrders(prev=>[{id,title:newTitle.trim(),customer:newCustomer.trim(),due:newDue?new Date(newDue+'T12:00:00').toLocaleDateString('hr-HR',{day:'numeric',month:'short'}):'Nije određeno',date:newDue||'2026-12-31',stage:'Nije započeto',progress:0,priority:'Normalan',owner:'Nije dodijeljen',color:'blue',material:newMaterial},...prev]);
    setNewTitle('');setNewCustomer('');setNewDue('');setNewMaterial('Brački kamen');setShowCreate(false);setFilter('Svi nalozi');setQuery('');
    notify('Radni nalog je dodan u ovaj pregled.');
  };
  const markDone = id => {setCompleted(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);notify(completed.includes(id)?'Nalog vraćen u aktivne.':'Nalog označen kao dovršen u ovom pregledu.');};
  const title = activeNav==='Pregled'?'Dobro jutro!':activeNav;
  const visibleInventory = showAllInventory?inventory:inventory.slice(0,3);

  return <div className="app-shell">
    <aside className={'sidebar '+(mobileNav?'sidebar-open':'')}>
      <div className="brand">
        <div className="brand-mark"><Layers3 size={23}/></div>
        <div className="brand-copy"><strong>KAMEN<span>.</span></strong><small>POSLOVNI SUSTAV</small></div>
        <button className="icon-button sidebar-close" onClick={()=>setMobileNav(false)} aria-label="Zatvori izbornik"><X size={18}/></button>
      </div>
      <button className="company-switch" onClick={()=>notify('Odabir tvrtke bit će dostupan nakon izrade prijave.')}><div className="company-avatar">KM</div><div className="company-copy"><strong>Kamen Studio</strong><small>Vlasnički račun</small></div><ChevronDown size={16}/></button>
      <nav className="nav-list" aria-label="Glavna navigacija">
        {nav.map((item,i)=><React.Fragment key={item.label}>{item.section&&<div className="nav-section">{item.section}</div>}<button className={'nav-item '+(activeNav===item.label?'active':'')} onClick={()=>{setActiveNav(item.label);setMobileNav(false);if(item.label!=='Pregled')notify('Prikaz '+item.label.toLowerCase()+' priprema se kao zaseban modul.')}}><item.icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{item.count&&<span className={'nav-count '+(item.alert?'nav-alert':'')}>{item.count}</span>}</button></React.Fragment>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Trebate pomoć?</strong><p>Vaš radni prostor, sve na jednom mjestu.</p><button onClick={()=>notify('Vodič za korištenje dodat ćemo uz prve funkcionalne module.')}>Otvori vodič <ArrowRight size={14}/></button></div>
        <button className="nav-item settings-item" onClick={()=>notify('Postavke će se otvoriti kada dodamo upravljanje tvrtkom.')}><Settings2 size={18}/><span>Postavke</span></button>
        <button className="profile-row" onClick={()=>setShowProfile(!showProfile)}><div className="user-avatar">VK</div><div className="profile-copy"><strong>Vlasnik računa</strong><small>Administrator tvrtke</small></div><MoreHorizontal size={19}/></button>
        {showProfile&&<div className="profile-pop"><strong>Demo radni prostor</strong><p>Podaci su ogledni i spremaju se samo u trenutačnom prikazu.</p><button onClick={()=>{setShowProfile(false);notify('Postavke profila još nisu povezane.')}}>Postavke profila</button></div>}
      </div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Zatvori navigaciju"/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Otvori izbornik"><Menu size={20}/></button><div className="breadcrumb">Radni prostor <ChevronRight size={14}/><strong>{activeNav}</strong></div></div>
        <div className="topbar-actions"><div className="global-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Traži nalog, kupca, materijal..." aria-label="Pretraži naloge"/><kbd>⌘ K</kbd></div><button className={'icon-button notification-button '+(showAlerts?'pressed':'')} onClick={()=>setShowAlerts(!showAlerts)} aria-label="Obavijesti"><Bell size={19}/><i/></button><div className="top-divider"/><div className="today"><CalendarDays size={16}/><span>Uto, 27. lis 2026.</span></div></div>
      </header>
      {showAlerts&&<div className="alert-popover"><div className="popover-head"><strong>Obavijesti</strong><button onClick={()=>setShowAlerts(false)} aria-label="Zatvori"><X size={16}/></button></div><div className="alert-row"><span className="alert-dot red"/><div><strong>Materijal pri kraju</strong><p>Impala granit i Carrara mramor imaju nisku zalihu.</p></div></div><div className="alert-row"><span className="alert-dot amber"/><div><strong>Rok je danas</strong><p>PR-2026-0042 — obiteljska grobnica Horvat.</p></div></div><small className="demo-note">Ogledne obavijesti · nisu povezane s bazom</small></div>}
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> RADNI PREGLED <span className="eyebrow-sep">/</span> UTORAK, 27. LISTOPADA</div><h1>{title} <span className="wave">✦</span></h1><p className="subtitle">{activeNav==='Pregled'?'Evo pregleda što se danas događa u vašoj radionici.':'Brzi pregled modula '+activeNav.toLowerCase()+'.'}</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={()=>notify('Izvoz će biti dostupan nakon povezivanja stvarnih podataka.')}><FileText size={16}/> Izvještaj</button><button className="button button-primary" onClick={()=>setShowCreate(true)}><Plus size={17}/> Novi radni nalog</button></div></section>
        <section className="stats-grid" aria-label="Ključni pokazatelji">
          <article className="stat-card"><div className="stat-top"><span>Aktivni nalozi</span><span className="stat-icon blue-icon"><ClipboardList size={18}/></span></div><div className="stat-value">{12+orders.length-initialOrders.length-completed.length}<span className="stat-unit">naloga</span></div><div className="stat-foot"><span className="trend positive"><ArrowUpRight size={14}/> 2</span><span>u odnosu na prošli tjedan</span></div><div className="mini-bars bars-blue"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>U proizvodnji</span><span className="stat-icon purple-icon"><Factory size={18}/></span></div><div className="stat-value">8<span className="stat-unit">naloga</span></div><div className="stat-foot"><span className="trend neutral"><Activity size={14}/> Stabilno</span><span>u aktivnim fazama</span></div><div className="mini-bars bars-purple"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Rok danas</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{orders.filter(o=>o.due==='Danas'&&!completed.includes(o.id)).length}<span className="stat-unit">nalog</span></div><div className="stat-foot"><span className="trend warning"><AlertTriangle size={14}/> Obratite pozornost</span></div><div className="mini-bars bars-amber"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Niska zaliha</span><span className="stat-icon red-icon"><Package size={18}/></span></div><div className="stat-value">{inventory.filter(i=>i.tone!=='good').length}<span className="stat-unit">materijala</span></div><div className="stat-foot"><span className="trend danger"><ArrowDownRight size={14}/> Potrebna provjera</span></div><div className="mini-bars bars-red"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>
        <section className="main-grid">
          <article className="panel orders-panel"><div className="panel-heading"><div><div className="panel-title-line"><h2>Radni nalozi</h2><span className="count-pill">{filteredOrders.length}</span></div><p>Pratite napredak i rokove aktivnih projekata.</p></div><button className="text-action" onClick={()=>{setActiveNav('Radni nalozi');notify('Prikaz svih naloga priprema se kao zaseban modul.')}}>Svi nalozi <ArrowRight size={15}/></button></div>
            <div className="orders-toolbar"><div className="filter-tabs">{['Svi nalozi','U tijeku','Hitni'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div><button className="filter-button" onClick={()=>{setFilter('Svi nalozi');setQuery('');notify('Filteri su očišćeni.')}}><Filter size={15}/> Očisti filtere</button></div>
            <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>RADNI NALOG</th><th>FAZA</th><th>NAPREDAK</th><th>ROK</th><th></th></tr></thead><tbody>{filteredOrders.length?filteredOrders.map(o=><tr key={o.id} className={completed.includes(o.id)?'row-completed':''}><td><div className="order-name"><span className={'order-symbol '+o.color}><Hammer size={16}/></span><div><strong>{o.title}</strong><small>{o.id} <span>·</span> {o.customer}</small></div></div></td><td><span className={'stage-tag '+(o.stage==='Čeka materijal'?'stage-wait':o.stage==='Nije započeto'?'stage-new':'')}>{o.stage==='Čeka materijal'&&<span className="tiny-dot"/>}{o.stage}</span></td><td><div className="progress-cell"><div className="progress-track"><span style={{width:o.progress+'%'}}/></div><small>{o.progress}%</small></div></td><td><span className={'due-date '+(o.due==='Danas'?'due-today':'')}>{o.due}</span></td><td><button className="row-action" aria-label={'Označi '+o.id} onClick={()=>markDone(o.id)} title="Označi dovršenim"><Check size={16}/></button></td></tr>):<tr><td colSpan="5"><div className="empty-state"><Search size={22}/><strong>Nema pronađenih naloga</strong><span>Pokušajte promijeniti pojam ili filter.</span></div></td></tr>}</tbody></table></div>
            <div className="panel-foot"><span>Prikazano {filteredOrders.length} oglednih naloga</span><span className="demo-label"><span/> DEMO PODACI</span></div>
          </article>
          <article className="panel inventory-panel"><div className="panel-heading"><div><div className="panel-title-line"><h2>Stanje skladišta</h2><span className="count-pill warning-pill">3</span></div><p>Materijali koje treba pratiti.</p></div><button className="icon-button more-button" onClick={()=>setShowAllInventory(!showAllInventory)} aria-label="Prikaži više materijala"><MoreHorizontal size={19}/></button></div>
            <div className="inventory-list">{visibleInventory.map(item=><div className="inventory-item" key={item.name}><div className={'material-thumb '+item.icon}><Layers3 size={18}/></div><div className="material-info"><strong>{item.name}</strong><small>{item.type}</small><div className="stock-meter"><span className={item.tone} style={{width:item.tone==='good'?'80%':item.tone==='warn'?'36%':'4%'}}/></div></div><div className="stock-right"><strong>{item.stock}</strong><span className={'stock-status '+item.tone}><i/>{item.state}</span></div></div>)}</div>
            <button className="inventory-link" onClick={()=>{setShowAllInventory(!showAllInventory);if(!showAllInventory)notify('Prikazani su svi ogledni materijali.')}}>{showAllInventory?'Prikaži manje':'Pregled skladišta'} <ArrowRight size={15}/></button>
          </article>
        </section>
        <section className="bottom-grid">
          <article className="panel schedule-panel"><div className="panel-heading"><div><h2>Današnji raspored</h2><p>Najvažnije aktivnosti u radionici.</p></div><span className="date-chip"><CalendarDays size={14}/> 27. lis</span></div><div className="timeline"><div className="timeline-row"><span className="timeline-time">08:00</span><span className="timeline-marker blue-marker"/><div className="timeline-copy"><strong>Početak poliranja</strong><span>PR-2026-0042 · M. Kovač</span></div><span className="timeline-status in-progress">U tijeku</span></div><div className="timeline-row"><span className="timeline-time">10:30</span><span className="timeline-marker purple-marker"/><div className="timeline-copy"><strong>CNC obrada</strong><span>PR-2026-0041 · D. Perić</span></div><span className="timeline-status planned">Planirano</span></div><div className="timeline-row"><span className="timeline-time">13:00</span><span className="timeline-marker amber-marker"/><div className="timeline-copy"><strong>Kontrola kvalitete</strong><span>PR-2026-0037 · M. Kovač</span></div><span className="timeline-status planned">Planirano</span></div></div></article>
          <article className="panel quick-panel"><div className="panel-heading"><div><h2>Brze radnje</h2><p>Najčešći zadaci na jednom mjestu.</p></div><Command size={18} className="muted-icon"/></div><div className="quick-actions"><button onClick={()=>setShowCreate(true)}><span className="quick-icon blue-icon"><Plus size={18}/></span><span><strong>Novi radni nalog</strong><small>Dodaj projekt u evidenciju</small></span><ChevronRight size={17}/></button><button onClick={()=>notify('Forma za primitak materijala bit će dodana u modulu Skladište.')}><span className="quick-icon green-icon"><Package size={18}/></span><span><strong>Zaprimanje materijala</strong><small>Evidentiraj novu ploču</small></span><ChevronRight size={17}/></button><button onClick={()=>notify('Evidencija terenskog rada bit će dio zasebnog modula.')}><span className="quick-icon violet-icon"><Truck size={18}/></span><span><strong>Terenski nalog</strong><small>Pripremi montažu</small></span><ChevronRight size={17}/></button></div></article>
        </section>
        <footer className="footer"><span>© 2026 Kamen-app</span><span><ShieldCheck size={14}/> Poslovni podaci moraju ostati privatni</span><span>Verzija 0.1 · Dizajn i funkcionalni prototip</span></footer>
      </div>
    </main>
    {showCreate&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span className="modal-kicker">RADNI NALOZI</span><h2 id="modal-title">Novi radni nalog</h2><p>Unesite osnovne podatke za početak evidencije.</p></div><button className="icon-button" onClick={()=>setShowCreate(false)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={createOrder}><label>Naziv naloga <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Npr. Nadgrobni spomenik — Novak" required/></label><label>Kupac / naručitelj <input value={newCustomer} onChange={e=>setNewCustomer(e.target.value)} placeholder="Ime kupca ili tvrtke" required/></label><div className="form-row"><label>Materijal<select value={newMaterial} onChange={e=>setNewMaterial(e.target.value)}><option>Brački kamen</option><option>Impala granit</option><option>Carrara mramor</option><option>Travertin</option><option>Drugi materijal</option></select></label><label>Rok isporuke<input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)}/></label></div><div className="modal-note"><AlertTriangle size={16}/><span>Ovo je prototip: unos se čuva samo u trenutačnom prikazu i nije trajno spremljen u bazu.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setShowCreate(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Dodaj nalog</button></div></form></section></div>}
    {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Zatvori poruku"><X size={15}/></button></div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
