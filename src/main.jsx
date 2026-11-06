import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, Boxes, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Command, Factory, FileText, Filter, Hammer, LayoutDashboard,
  Menu, MoreHorizontal, Package, Plus, Search, Settings2, ShieldCheck,
  Truck, Users, Wallet, X, HardHat, ClipboardList, Layers3, PackageCheck
} from 'lucide-react';
import './styles.css';
import { resetDemoDataOnce } from './lib/resetDemoData.js';

resetDemoDataOnce();
import ModulePlaceholder from './components/ModulePlaceholder.jsx';

const initialOrders = [];
const nav = [
  {label:'Pregled', icon:LayoutDashboard, section:'RADNI PROSTOR'},
  {label:'Radni nalozi', icon:ClipboardList},
  {label:'Proizvodnja', icon:Factory},
  {label:'Skladište', icon:Boxes},
  {label:'Terenski rad', icon:Truck},
  {label:'Kupci', icon:Users},
  {label:'Troškovi i izvještaji', icon:Wallet, section:'POSLOVANJE'},
];
const money = n => new Intl.NumberFormat('hr-HR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);

function App(){
  const [orders,setOrders] = useState(()=>{try{const saved=window.localStorage.getItem('kamen-app-work-orders-v1');return saved?JSON.parse(saved):initialOrders}catch{return initialOrders}});
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
  const [newMaterial,setNewMaterial] = useState('');
  const [newDue,setNewDue] = useState('');
  const [showAllInventory,setShowAllInventory] = useState(false);
  const [inventory,setInventory] = useState(()=>{try{return JSON.parse(window.localStorage.getItem('kamen-app-materials-v1')||'[]')}catch{return []}});
  const [completed,setCompleted] = useState([]);
  const filteredOrders = useMemo(()=>orders.filter(o=>{
    const q=query.trim().toLocaleLowerCase('hr');
    const matches=!q || [o.id,o.title||o.project,o.customer,o.stage||o.status,o.material].some(v=>(v||'').toLocaleLowerCase('hr').includes(q));
    const status=filter==='Svi nalozi' || (filter==='Hitni'&&o.priority==='Visok') || (filter==='U tijeku'&&['Spreman za pilanje','U tijeku','Čeka kontrolu'].includes(o.status||o.stage));
    return matches&&status;
  }),[orders,query,filter]);
  const notify = msg => {setToast(msg); window.setTimeout(()=>setToast(''),2600)};
  const createOrder = e => {
    e.preventDefault();
    if(!newTitle.trim()||!newCustomer.trim()){notify('Unesite naziv naloga i kupca.');return;}
    const id='RN-2026-'+String(Math.max(0,...orders.map(o=>Number(String(o.id).split('-').at(-1))||0))+1).padStart(3,'0');
    const nextOrder={id,customer:newCustomer.trim(),project:newTitle.trim(),material:newMaterial.trim(),due:newDue,status:'U pripremi',pieces:[],note:''};
    setOrders(prev=>[nextOrder,...prev]);
    try{window.localStorage.setItem('kamen-app-work-orders-v1',JSON.stringify([nextOrder,...orders]));}catch{}
    setNewTitle('');setNewCustomer('');setNewDue('');setNewMaterial('');setShowCreate(false);setFilter('Svi nalozi');setQuery('');
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
        {nav.map((item,i)=><React.Fragment key={item.label}>{item.section&&<div className="nav-section">{item.section}</div>}<button className={'nav-item '+(activeNav===item.label?'active':'')} onClick={()=>{setActiveNav(item.label);setMobileNav(false)}}><item.icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{item.count&&<span className={'nav-count '+(item.alert?'nav-alert':'')}>{item.count}</span>}</button></React.Fragment>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Trebate pomoć?</strong><p>Vaš radni prostor, sve na jednom mjestu.</p><button onClick={()=>notify('Vodič za korištenje dodat ćemo uz prve funkcionalne module.')}>Otvori vodič <ArrowRight size={14}/></button></div>
        <button className="nav-item settings-item" onClick={()=>{setActiveNav('Postavke');setMobileNav(false)}}><Settings2 size={18}/><span>Postavke</span></button>
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
      {showAlerts&&<div className="alert-popover"><div className="popover-head"><strong>Obavijesti</strong><button onClick={()=>setShowAlerts(false)} aria-label="Zatvori"><X size={16}/></button></div><div className="empty-state"><strong>Nema novih obavijesti</strong><span>Obavijesti će se prikazivati prema stvarnim zalihama i rokovima.</span></div></div>}
      {activeNav === 'Pregled' ? <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> RADNI PREGLED <span className="eyebrow-sep">/</span> UTORAK, 27. LISTOPADA</div><h1>{title} <span className="wave">✦</span></h1><p className="subtitle">{activeNav==='Pregled'?'Evo pregleda što se danas događa u vašoj radionici.':'Brzi pregled modula '+activeNav.toLowerCase()+'.'}</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={()=>notify('Izvještaj će se izraditi iz stvarnih evidentiranih podataka.')}><FileText size={16}/> Izvještaj</button><button className="button button-primary" onClick={()=>setShowCreate(true)}><Plus size={17}/> Novi radni nalog</button></div></section>
        <section className="stats-grid" aria-label="Ključni pokazatelji">
          <article className="stat-card"><div className="stat-top"><span>Aktivni nalozi</span><span className="stat-icon blue-icon"><ClipboardList size={18}/></span></div><div className="stat-value">{Math.max(0,orders.length-completed.length)}<span className="stat-unit">naloga</span></div><div className="stat-foot"><span className="trend neutral"><Activity size={14}/> Evidencija</span><span>stvarni radni nalozi</span></div><div className="mini-bars bars-blue"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>U proizvodnji</span><span className="stat-icon purple-icon"><Factory size={18}/></span></div><div className="stat-value">{orders.filter(o=>['Spreman za pilanje','U tijeku','Čeka kontrolu'].includes(o.status||o.stage)).length}<span className="stat-unit">naloga</span></div><div className="stat-foot"><span className="trend neutral"><Activity size={14}/> Stabilno</span><span>u aktivnim fazama</span></div><div className="mini-bars bars-purple"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Rok danas</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{orders.filter(o=>o.due==='Danas'&&!completed.includes(o.id)).length}<span className="stat-unit">nalog</span></div><div className="stat-foot"><span className="trend warning"><AlertTriangle size={14}/> Obratite pozornost</span></div><div className="mini-bars bars-amber"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Niska zaliha</span><span className="stat-icon red-icon"><Package size={18}/></span></div><div className="stat-value">{inventory.filter(i=>Number(i.quantity||0)<=Number(i.min||0)).length}<span className="stat-unit">materijala</span></div><div className="stat-foot"><span className="trend danger"><ArrowDownRight size={14}/> Potrebna provjera</span></div><div className="mini-bars bars-red"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>
        <section className="main-grid">
          <article className="panel orders-panel"><div className="panel-heading"><div><div className="panel-title-line"><h2>Radni nalozi</h2><span className="count-pill">{filteredOrders.length}</span></div><p>Pratite napredak i rokove aktivnih projekata.</p></div><button className="text-action" onClick={()=>setActiveNav('Radni nalozi')}>Svi nalozi <ArrowRight size={15}/></button></div>
            <div className="orders-toolbar"><div className="filter-tabs">{['Svi nalozi','U tijeku','Hitni'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div><button className="filter-button" onClick={()=>{setFilter('Svi nalozi');setQuery('');notify('Filteri su očišćeni.')}}><Filter size={15}/> Očisti filtere</button></div>
            <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>RADNI NALOG</th><th>FAZA</th><th>NAPREDAK</th><th>ROK</th><th></th></tr></thead><tbody>{filteredOrders.length?filteredOrders.map(o=><tr key={o.id} className={completed.includes(o.id)?'row-completed':''}><td><div className="order-name"><span className={'order-symbol '+o.color}><Hammer size={16}/></span><div><strong>{o.title||o.project}</strong><small>{o.id} <span>·</span> {o.customer}</small></div></div></td><td><span className={'stage-tag '+(o.stage==='Čeka materijal'?'stage-wait':o.stage==='Nije započeto'?'stage-new':'')}>{o.stage==='Čeka materijal'&&<span className="tiny-dot"/>}{o.stage}</span></td><td><div className="progress-cell"><div className="progress-track"><span style={{width:(o.progress??0)+'%'}}/></div><small>{o.progress??0}%</small></div></td><td><span className={'due-date '+(o.due==='Danas'?'due-today':'')}>{o.due||'Rok nije određen'}</span></td><td><button className="row-action" aria-label={'Označi '+o.id} onClick={()=>markDone(o.id)} title="Označi dovršenim"><Check size={16}/></button></td></tr>):<tr><td colSpan="5"><div className="empty-state"><Search size={22}/><strong>Nema pronađenih naloga</strong><span>Pokušajte promijeniti pojam ili filter.</span></div></td></tr>}</tbody></table></div>
            <div className="panel-foot"><span>Prikazano {filteredOrders.length} radnih naloga</span></div>
          </article>
          <article className="panel inventory-panel"><div className="panel-heading"><div><div className="panel-title-line"><h2>Stanje skladišta</h2><span className="count-pill">{inventory.length}</span></div><p>Materijali koje treba pratiti.</p></div><button className="icon-button more-button" onClick={()=>setShowAllInventory(!showAllInventory)} aria-label="Prikaži više materijala"><MoreHorizontal size={19}/></button></div>
            <div className="inventory-list">{visibleInventory.length?visibleInventory.map(item=><div className="inventory-item" key={item.id}><div className="material-thumb stone"><Layers3 size={18}/></div><div className="material-info"><strong>{item.name}</strong><small>{item.type} · {item.thickness||'—'} cm</small><div className="stock-meter"><span className={item.quantity<=item.min?'warn':'good'} style={{width:item.quantity<=item.min?'30%':'80%'}}/></div></div><div className="stock-right"><strong>{item.quantity} {item.unit}</strong><span className={'stock-status '+(item.quantity<=item.min?'warn':'good')}><i/>{item.quantity<=item.min?'Niska zaliha':'Dostupno'}</span></div></div>):<div className="empty-state"><Boxes size={22}/><strong>Skladište je prazno</strong><span>Dodaj prvu stvarno zaprimljenu ploču ili materijal.</span></div>}</div>
            <button className="inventory-link" onClick={()=>{setShowAllInventory(!showAllInventory);if(!showAllInventory)notify('Prikazani su svi evidentirani materijali.')}}>{showAllInventory?'Prikaži manje':'Pregled skladišta'} <ArrowRight size={15}/></button>
          </article>
        </section>
        <section className="bottom-grid">
          <article className="panel schedule-panel"><div className="panel-heading"><div><h2>Današnji raspored</h2><p>Najvažnije aktivnosti u radionici.</p></div><span className="date-chip"><CalendarDays size={14}/> 27. lis</span></div><div className="warehouse-empty"><CalendarDays size={22}/><strong>Nema planiranih aktivnosti</strong><span>Raspored će se popunjavati iz stvarnih radnih i terenskih naloga.</span></div></article>
          <article className="panel quick-panel"><div className="panel-heading"><div><h2>Brze radnje</h2><p>Najčešći zadaci na jednom mjestu.</p></div><Command size={18} className="muted-icon"/></div><div className="quick-actions"><button onClick={()=>setShowCreate(true)}><span className="quick-icon blue-icon"><Plus size={18}/></span><span><strong>Novi radni nalog</strong><small>Dodaj projekt u evidenciju</small></span><ChevronRight size={17}/></button><button onClick={()=>setActiveNav('Skladište')}><span className="quick-icon green-icon"><Package size={18}/></span><span><strong>Zaprimanje materijala</strong><small>Otvori skladište i dodaj novu zalihu</small></span><ChevronRight size={17}/></button><button onClick={()=>setActiveNav('Terenski rad')}><span className="quick-icon violet-icon"><Truck size={18}/></span><span><strong>Terenski nalog</strong><small>Pripremi montažu</small></span><ChevronRight size={17}/></button></div></article>
        </section>
        <footer className="footer"><span>© 2026 Kamen-app</span><span><ShieldCheck size={14}/> Poslovni podaci moraju ostati privatni</span><span>Verzija 0.1 · Dizajn i funkcionalni prototip</span></footer>
      </div> : <ModulePlaceholder name={activeNav} onBack={()=>{try{setOrders(JSON.parse(window.localStorage.getItem('kamen-app-work-orders-v1')||'[]'));setInventory(JSON.parse(window.localStorage.getItem('kamen-app-materials-v1')||'[]'));}catch{}setActiveNav('Pregled')}} />}
    </main>
    {showCreate&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span className="modal-kicker">RADNI NALOZI</span><h2 id="modal-title">Novi radni nalog</h2><p>Unesite osnovne podatke za početak evidencije.</p></div><button className="icon-button" onClick={()=>setShowCreate(false)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={createOrder}><label>Naziv naloga <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Npr. Nadgrobni spomenik — Novak" required/></label><label>Kupac / naručitelj <input value={newCustomer} onChange={e=>setNewCustomer(e.target.value)} placeholder="Ime kupca ili tvrtke" required/></label><div className="form-row"><label>Materijal<input list="dashboard-material-options" value={newMaterial} onChange={e=>setNewMaterial(e.target.value)} placeholder="Upiši materijal"/><datalist id="dashboard-material-options">{inventory.map(item=><option key={item.id} value={item.name}/>)}</datalist></label><label>Rok isporuke<input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)}/></label></div><div className="modal-note"><AlertTriangle size={16}/><span>Radni nalog će biti spremljen u zajedničku lokalnu evidenciju i prikazan u modulu Radni nalozi.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setShowCreate(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Dodaj nalog</button></div></form></section></div>}
    {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Zatvori poruku"><X size={15}/></button></div>}
  </div>
}
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Nepoznata pogreška' };
  }
  componentDidCatch(error) {
    console.error('Kamen-app render error:', error);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{maxWidth:600,margin:'10vh auto',padding:28,fontFamily:'system-ui,sans-serif',color:'#202b3c',background:'#fff',border:'1px solid #e3e8f0',borderRadius:16,boxShadow:'0 12px 40px #15213a12'}}>
        <h1 style={{marginTop:0}}>Kamen-app je naišao na pogrešku</h1>
        <p>Podaci u pregledniku nisu namjerno obrisani. Pokušaj ponovno učitati aplikaciju. Ako se pogreška ponovi, poruka ispod pomoći će nam pronaći uzrok.</p>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:12,background:'#f5f7fb',borderRadius:8}}>{this.state.message}</pre>
        <button style={{padding:'10px 16px',border:0,borderRadius:8,background:'#3468e8',color:'#fff',fontWeight:700,cursor:'pointer'}} onClick={() => window.location.reload()}>Ponovno učitaj</button>
      </div>;
    }
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
