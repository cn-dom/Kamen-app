import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, Boxes, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Command, Factory, FileText, Filter, Hammer, LayoutDashboard,
  Menu, MoreHorizontal, Package, Plus, Search, Settings2, ShieldCheck, Wrench,
  Truck, Users, Wallet, X, HardHat, ShoppingCart, ClipboardList, Layers3, PackageCheck, Sparkles
} from 'lucide-react';
import './styles.css';
import { lowStockSuggestions } from './lib/purchasing.js';
import { dashboardOperationalAlerts } from './lib/maintenance.js';
import { getInvoiceReceivables } from './lib/invoices.js';

import ModulePlaceholder from './components/ModulePlaceholder.jsx';
import OperationsMonitorModule from './components/OperationsMonitorModule.jsx';
import FieldWorkModule from './components/FieldWorkModule.jsx';
import ProductionModule from './components/ProductionModule.jsx';
import AccessControlModule from './components/AccessControlModule.jsx';
import ToolsModule from './components/ToolsModule.jsx';
import ScheduleModule from './components/ScheduleModule.jsx';
import DocumentsModule from './components/DocumentsModule.jsx';
import NotificationsModule from './components/NotificationsModule.jsx';
import { buildProductionUnits, PRODUCTION_STAGES } from './lib/production.js';
import { analyzeWorkshopCapacity } from './lib/workshopMonitor.js';

const initialOrders = [];
const nav = [
  {label:'Pregled', icon:LayoutDashboard, section:'RADNI PROSTOR'},
  {label:'Pametni nadzor', icon:Sparkles},
  {label:'Radni nalozi', icon:ClipboardList},
  {label:'Proizvodnja', icon:Factory},
  {label:'Raspored', icon:CalendarDays},
  {label:'Nabava', icon:ShoppingCart},
  {label:'Ponude', icon:FileText, section:'POSLOVANJE'},
  {label:'Isporuke i naplata', icon:PackageCheck},
  {label:'Servis i reklamacije', icon:Wrench, section:'PODRŠKA I JAMSTVA'},
  {label:'Održavanje strojeva', icon:Settings2, section:'RADIONICA I OPREMA'},
  {label:'Alati i oprema', icon:Hammer},
  {label:'Dokumenti', icon:FileText, section:'DOKUMENTACIJA'},
  {label:'Obavijesti', icon:Bell},
  {label:'Skladište', icon:Boxes},
  {label:'Terenski rad', icon:Truck},
  {label:'Kupci', icon:Users},
  {label:'Korisnici i ovlasti', icon:ShieldCheck, section:'ADMINISTRACIJA'},
  {label:'Troškovi i izvještaji', icon:Wallet, section:'POSLOVANJE'},
];
const money = n => new Intl.NumberFormat('hr-HR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);

function App(){
  const [orders,setOrders] = useState(()=>{try{const saved=window.localStorage.getItem('kamen-app-work-orders-v1');return saved?JSON.parse(saved):initialOrders}catch{return initialOrders}});
  const [activeNav,setActiveNav] = useState('Pregled');
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('Svi nalozi');
  const [openWorkOrderOnEnter,setOpenWorkOrderOnEnter] = useState(false);
  const [showAlerts,setShowAlerts] = useState(false);
  const [openLowStockOnEnter,setOpenLowStockOnEnter] = useState(false);
  const [showProfile,setShowProfile] = useState(false);
  const [mobileNav,setMobileNav] = useState(false);
  const [toast,setToast] = useState('');
  const [showAllInventory,setShowAllInventory] = useState(false);
  const [inventory,setInventory] = useState(()=>{try{return JSON.parse(window.localStorage.getItem('kamen-app-materials-v1')||'[]')}catch{return []}});
  const [machines,setMachines] = useState(()=>{try{return JSON.parse(window.localStorage.getItem('kamen-app-equipment-register-v1')||'[]')}catch{return []}});
  const [invoices,setInvoices] = useState(()=>{try{return JSON.parse(window.localStorage.getItem('kamen-app-invoices-v1')||'[]')}catch{return []}});
  const [payments,setPayments] = useState(()=>{try{return JSON.parse(window.localStorage.getItem('kamen-app-payments-v1')||'[]')}catch{return []}});
  const [productionData,setProductionData] = useState(()=>{try{return JSON.parse(window.localStorage.getItem('kamen-app-production-stages-v1')||'{}')}catch{return {}}});
  const lowStockItems = useMemo(()=>lowStockSuggestions(inventory),[inventory]);
  const lowStockIds = useMemo(()=>new Set(lowStockItems.map(item=>item.id)),[lowStockItems]);
  const operationalAlerts = useMemo(()=>dashboardOperationalAlerts(machines,orders),[machines,orders]);
  const overdueReceivables = useMemo(()=>getInvoiceReceivables(invoices,payments,new Date().toISOString().slice(0,10)).filter(row=>row.isOverdue),[invoices,payments]);
  const workshopReport = useMemo(()=>analyzeWorkshopCapacity(orders,productionData),[orders,productionData]);
  const productionUnits = useMemo(()=>buildProductionUnits(orders,inventory),[orders,inventory]);
  const productionStageSummary = useMemo(()=>PRODUCTION_STAGES.map(stage=>({name:stage,active:productionUnits.filter(row=>productionData.pieces?.[row.key]?.stages?.[stage]?.status==='U tijeku').length,blocked:productionUnits.filter(row=>productionData.pieces?.[row.key]?.stages?.[stage]?.status==='Zastoj').length,completed:productionUnits.filter(row=>productionData.pieces?.[row.key]?.stages?.[stage]?.status==='Završeno').length})),[productionUnits,productionData]);
  const alertCount = lowStockItems.length + operationalAlerts.length + overdueReceivables.length + workshopReport.alerts.length;
  
  const filteredOrders = useMemo(()=>orders.filter(o=>{
    const q=query.trim().toLocaleLowerCase('hr');
    const matches=!q || [o.id,o.title||o.project,o.customer,o.stage||o.status,o.material].some(v=>(v||'').toLocaleLowerCase('hr').includes(q));
    const status=filter==='Svi nalozi' || (filter==='Hitni'&&o.priority==='Visok') || (filter==='U tijeku'&&['Spreman za pilanje','U tijeku','Čeka kontrolu'].includes(o.status||o.stage));
    return matches&&status;
  }),[orders,query,filter]);
  const notify = msg => {setToast(msg); window.setTimeout(()=>setToast(''),2600)};
  const openDetailedWorkOrder = () => {
    setOpenWorkOrderOnEnter(true);
    setActiveNav('Radni nalozi');
    setFilter('Svi nalozi');
    setQuery('');
  };
  const currentHour = new Date().getHours();
  const greeting = currentHour >= 5 && currentHour < 11 ? 'Dobro jutro!' : currentHour >= 11 && currentHour < 18 ? 'Dobar dan!' : 'Dobra večer!';
  const title = activeNav==='Pregled'?greeting:activeNav;
  const activeInventory = inventory.filter(item => !item.archived);
  const visibleInventory = showAllInventory ? activeInventory : activeInventory.slice(0,3);

  return <div className="app-shell">
    <aside className={'sidebar '+(mobileNav?'sidebar-open':'')}>
      <div className="brand">
        <div className="brand-mark"><Layers3 size={23}/></div>
        <div className="brand-copy"><strong>KAMEN<span>.</span></strong><small>POSLOVNI SUSTAV</small></div>
        <button className="icon-button sidebar-close" onClick={()=>setMobileNav(false)} aria-label="Zatvori izbornik"><X size={18}/></button>
      </div>
      <button className="company-switch" onClick={()=>notify('Odabir tvrtke bit će dostupan nakon izrade prijave.')}><div className="company-avatar">KM</div><div className="company-copy"><strong>Kamen Studio</strong><small>Vlasnički račun</small></div><ChevronDown size={16}/></button>
      <nav className="nav-list" aria-label="Glavna navigacija">
        {nav.map((item,i)=><React.Fragment key={item.label}>{item.section&&<div className="nav-section">{item.section}</div>}<button className={'nav-item '+(activeNav===item.label?'active':'')} onClick={()=>{setActiveNav(item.label);if(item.label!=='Nabava')setOpenLowStockOnEnter(false);if(item.label==='Pregled'){try{setOrders(JSON.parse(window.localStorage.getItem('kamen-app-work-orders-v1')||'[]'));setInventory(JSON.parse(window.localStorage.getItem('kamen-app-materials-v1')||'[]'));setMachines(JSON.parse(window.localStorage.getItem('kamen-app-equipment-register-v1')||'[]'));setInvoices(JSON.parse(window.localStorage.getItem('kamen-app-invoices-v1')||'[]'));setPayments(JSON.parse(window.localStorage.getItem('kamen-app-payments-v1')||'[]'));setProductionData(JSON.parse(window.localStorage.getItem('kamen-app-production-stages-v1')||'{}'));}catch{}}if(item.label==='Pametni nadzor')setProductionData(JSON.parse(window.localStorage.getItem('kamen-app-production-stages-v1')||'{}'));setMobileNav(false)}}><item.icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{item.count&&<span className={'nav-count '+(item.alert?'nav-alert':'')}>{item.count}</span>}{item.label==='Nabava'&&lowStockItems.length>0&&<span className="nav-count nav-alert">{lowStockItems.length}</span>}</button></React.Fragment>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Trebate pomoć?</strong><p>Vaš radni prostor, sve na jednom mjestu.</p><button onClick={()=>notify('Vodič za korištenje dodat ćemo uz prve funkcionalne module.')}>Otvori vodič <ArrowRight size={14}/></button></div>
        <button className="nav-item settings-item" onClick={()=>{setActiveNav('Postavke');setMobileNav(false)}}><Settings2 size={18}/><span>Postavke</span></button>
        <button className="profile-row" onClick={()=>setShowProfile(!showProfile)}><div className="user-avatar">VK</div><div className="profile-copy"><strong>Vlasnik računa</strong><small>Administrator tvrtke</small></div><MoreHorizontal size={19}/></button>
        {showProfile&&<div className="profile-pop"><strong>Radni prostor</strong><p>Podaci se trenutačno spremaju lokalno u ovaj preglednik.</p><button onClick={()=>{setShowProfile(false);notify('Postavke profila još nisu povezane.')}}>Postavke profila</button></div>}
      </div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Zatvori navigaciju"/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Otvori izbornik"><Menu size={20}/></button><div className="breadcrumb">Radni prostor <ChevronRight size={14}/><strong>{activeNav}</strong></div></div>
        <div className="topbar-actions"><div className="global-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Traži nalog, kupca, materijal..." aria-label="Pretraži naloge"/><kbd>⌘ K</kbd></div><button className={'icon-button notification-button '+(showAlerts?'pressed':'')} onClick={()=>setShowAlerts(!showAlerts)} aria-label={'Obavijesti, '+alertCount+' upozorenja'}><Bell size={19}/>{alertCount>0&&<i/>}</button><div className="top-divider"/><div className="today"><CalendarDays size={16}/><span>{new Date().toLocaleDateString('hr-HR',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span></div></div>
      </header>
      {showAlerts&&<div className="alert-popover"><div className="popover-head"><strong>Operativna upozorenja <span className="alert-total">{alertCount}</span></strong><button onClick={()=>setShowAlerts(false)} aria-label="Zatvori"><X size={16}/></button></div>{alertCount>0?<><div className="alert-list">{overdueReceivables.slice(0,8).map(row=><button className="alert-row alert-row-button" key={'invoice-'+row.invoice.id} onClick={()=>{setActiveNav('Isporuke i naplata');setShowAlerts(false);setOpenLowStockOnEnter(false)}}><span className="alert-dot red"/><span className="alert-row-copy"><strong>{row.invoice.number} · {row.invoice.customerName||'Kupac'}</strong><p>Kasni {row.daysOverdue} dana · Preostalo {money(row.due)} · Potraživanja</p></span><ArrowRight size={14}/></button>)}{operationalAlerts.slice(0,Math.max(0,8-overdueReceivables.length)).map(item=><button className="alert-row alert-row-button" key={item.id} onClick={()=>{setActiveNav(item.destination);setShowAlerts(false);setOpenLowStockOnEnter(false)}}><span className={'alert-dot '+(item.severity==='high'?'red':'amber')}/><span className="alert-row-copy"><strong>{item.title}</strong><p>{item.description} · {item.type==='maintenance'?'Održavanje strojeva':'Radni nalozi'}</p></span><ArrowRight size={14}/></button>)}{lowStockItems.slice(0,Math.max(0,8-overdueReceivables.length-operationalAlerts.length)).map(item=><button className="alert-row alert-row-button" key={'stock-'+item.id} onClick={()=>{setOpenLowStockOnEnter(true);setActiveNav('Nabava');setShowAlerts(false)}}><span className="alert-dot red"/><span className="alert-row-copy"><strong>{item.name||'Materijal bez naziva'}</strong><p>Stanje: {item.currentQuantity} {item.unit||'kom'} · Minimum: {item.minimumQuantity} {item.unit||'kom'} · Nabava</p></span><ArrowRight size={14}/></button>)}{workshopReport.alerts.slice(0,Math.max(0,8-overdueReceivables.length-operationalAlerts.length-lowStockItems.length)).map(item=><button className="alert-row alert-row-button" key={item.id} onClick={()=>{setActiveNav('Pametni nadzor');setShowAlerts(false)}}><span className={'alert-dot '+(item.severity==='warning'?'amber':'blue')}/><span className="alert-row-copy"><strong>{item.title}</strong><p>{item.description} · Pametni nadzor</p></span><ArrowRight size={14}/></button>)}</div>{alertCount>8&&<small className="alert-more">Prikazano je prvih 8 upozorenja. Otvori odgovarajući modul za cijeli popis.</small>}</>:<div className="empty-state"><CheckCircle2 size={21}/><strong>Nema aktivnih upozorenja</strong><span>Rokovi naloga, servisi, potraživanja i minimalne zalihe trenutačno su pod kontrolom.</span></div>}</div>}
      {activeNav === 'Pregled' ? <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> RADNI PREGLED <span className="eyebrow-sep">/</span> {new Date().toLocaleDateString('hr-HR',{weekday:'long',day:'numeric',month:'long'}).toLocaleUpperCase('hr')}</div><h1>{title} <span className="wave">✦</span></h1><p className="subtitle">{activeNav==='Pregled'?'Evo pregleda što se danas događa u vašoj radionici.':'Brzi pregled modula '+activeNav.toLowerCase()+'.'}</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={()=>notify('Izvještaj će se izraditi iz stvarnih evidentiranih podataka.')}><FileText size={16}/> Izvještaj</button><button className="button button-primary" onClick={openDetailedWorkOrder}><Plus size={17}/> Novi radni nalog</button></div></section>
        <section className="stats-grid" aria-label="Ključni pokazatelji">
          <article className="stat-card"><div className="stat-top"><span>Aktivni nalozi</span><span className="stat-icon blue-icon"><ClipboardList size={18}/></span></div><div className="stat-value">{orders.filter(o=>!['Završen','Otkazan'].includes(o.status)).length}<span className="stat-unit">naloga</span></div><div className="stat-foot"><span className="trend neutral"><Activity size={14}/> Evidencija</span><span>stvarni radni nalozi</span></div><div className="mini-bars bars-blue"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>U proizvodnji</span><span className="stat-icon purple-icon"><Factory size={18}/></span></div><div className="stat-value">{orders.filter(o=>['Spreman za pilanje','U tijeku','Čeka kontrolu'].includes(o.status||o.stage)).length}<span className="stat-unit">naloga</span></div><div className="stat-foot"><span className="trend neutral"><Activity size={14}/> Stabilno</span><span>u aktivnim fazama</span></div><div className="mini-bars bars-purple"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Rokovi i servisi</span><span className="stat-icon amber-icon"><Clock3 size={18}/></span></div><div className="stat-value">{operationalAlerts.filter(item=>item.severity==='high').length}<span className="stat-unit">upozorenja</span></div><div className="stat-foot"><span className="trend warning"><AlertTriangle size={14}/> Obratite pozornost</span></div><div className="mini-bars bars-amber"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Niska zaliha</span><span className="stat-icon red-icon"><Package size={18}/></span></div><div className="stat-value">{lowStockItems.length}<span className="stat-unit">materijala</span></div><div className="stat-foot"><span className="trend danger"><ArrowDownRight size={14}/> Potrebna provjera</span></div><div className="mini-bars bars-red"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>
        <section className="main-grid">
          <article className="panel orders-panel"><div className="panel-heading"><div><div className="panel-title-line"><h2>Radni nalozi</h2><span className="count-pill">{filteredOrders.length}</span></div><p>Pratite napredak i rokove aktivnih projekata.</p></div><button className="text-action" onClick={()=>setActiveNav('Radni nalozi')}>Svi nalozi <ArrowRight size={15}/></button></div>
            <div className="orders-toolbar"><div className="filter-tabs">{['Svi nalozi','U tijeku','Hitni'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div><button className="filter-button" onClick={()=>{setFilter('Svi nalozi');setQuery('');notify('Filteri su očišćeni.')}}><Filter size={15}/> Očisti filtere</button></div>
            <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>RADNI NALOG</th><th>FAZA</th><th>NAPREDAK</th><th>ROK</th><th></th></tr></thead><tbody>{filteredOrders.length?filteredOrders.map(o=><tr key={o.id} className={o.status==='Završen'?'row-completed':''}><td><div className="order-name"><span className={'order-symbol '+(o.color||'blue')}><Hammer size={16}/></span><div><strong>{o.title||o.project}</strong><small>{o.id} <span>·</span> {o.customer}</small></div></div></td><td><span className={'stage-tag '+((o.stage||o.status)==='Čeka materijal'?'stage-wait':(o.stage||o.status)==='Nije započeto'?'stage-new':'')}>{(o.stage||o.status)==='Čeka materijal'&&<span className="tiny-dot"/>}{o.stage||o.status||'U pripremi'}</span></td><td><div className="progress-cell"><div className="progress-track"><span style={{width:(o.progress??0)+'%'}}/></div><small>{o.progress??0}%</small></div></td><td><span className={'due-date '+(o.due==='Danas'?'due-today':'')}>{o.due||'Rok nije određen'}</span></td><td><button className="row-action" aria-label={'Označi '+o.id} onClick={()=>setActiveNav('Radni nalozi')} title="Otvori radne naloge"><ArrowRight size={16}/></button></td></tr>):<tr><td colSpan="5"><div className="empty-state"><Search size={22}/><strong>Nema pronađenih naloga</strong><span>Pokušajte promijeniti pojam ili filter.</span></div></td></tr>}</tbody></table></div>
            <div className="panel-foot"><span>Prikazano {filteredOrders.length} radnih naloga</span></div>
          </article>
          <article className="panel inventory-panel"><div className="panel-heading"><div><div className="panel-title-line"><h2>Stanje skladišta</h2><span className="count-pill">{inventory.length}</span></div><p>Materijali koje treba pratiti.</p></div><button className="icon-button more-button" onClick={()=>setShowAllInventory(!showAllInventory)} aria-label="Prikaži više materijala"><MoreHorizontal size={19}/></button></div>
            <div className="inventory-list">{visibleInventory.length?visibleInventory.map(item=><div className="inventory-item" key={item.id}><div className="material-thumb stone"><Layers3 size={18}/></div><div className="material-info"><strong>{item.name}</strong><small>{item.type} · {item.thickness||'—'} cm</small><div className="stock-meter"><span className={lowStockIds.has(item.id)?'warn':'good'} style={{width:lowStockIds.has(item.id)?'30%':'80%'}}/></div></div><div className="stock-right"><strong>{item.quantity} {item.unit}</strong><span className={'stock-status '+(lowStockIds.has(item.id)?'warn':'good')}><i/>{lowStockIds.has(item.id)?'Niska zaliha':'Dostupno'}</span></div></div>):<div className="empty-state"><Boxes size={22}/><strong>Skladište je prazno</strong><span>Dodaj prvu stvarno zaprimljenu ploču ili materijal.</span></div>}</div>
            <button className="inventory-link" onClick={()=>{setShowAllInventory(!showAllInventory);if(!showAllInventory)notify('Prikazani su svi evidentirani materijali.')}}>{showAllInventory?'Prikaži manje':'Pregled skladišta'} <ArrowRight size={15}/></button>
          </article>
        </section>
        <section className="bottom-grid">
          <article className="panel production-summary-panel"><div className="panel-heading"><div><h2>Kontrola proizvodnje</h2><p>Stanje stvarnih komada po fazama obrade.</p></div><button className="text-action" onClick={()=>setActiveNav('Proizvodnja')}>Otvori proizvodnju <ArrowRight size={15}/></button></div>{productionUnits.length?<div className="production-summary-list">{productionStageSummary.map(stage=><div className="production-summary-row" key={stage.name}><div className="production-summary-name"><strong>{stage.name}</strong><small>{stage.completed} završeno od {productionUnits.length} kom.</small></div><div className="production-summary-track"><span style={{width:Math.round(stage.completed/productionUnits.length*100)+'%'}}/></div><div className="production-summary-counts"><span className="summary-active">{stage.active} u radu</span>{stage.blocked>0&&<span className="summary-blocked">{stage.blocked} zastoj</span>}</div></div>)}</div>:<div className="warehouse-empty"><Factory size={22}/><strong>Proizvodnja čeka prve komade</strong><span>Izradite radni nalog s dimenzijama i količinama kako bi se svaki komad pratio kroz faze.</span></div>}<div className="production-summary-foot"><span>{productionUnits.length} fizičkih komada u evidenciji</span><button onClick={()=>setActiveNav('Proizvodnja')}>Detaljna evidencija <ArrowRight size={14}/></button></div></article>
          <article className="panel quick-panel"><div className="panel-heading"><div><h2>Brze radnje</h2><p>Najčešći zadaci na jednom mjestu.</p></div><Command size={18} className="muted-icon"/></div><div className="quick-actions"><button onClick={openDetailedWorkOrder}><span className="quick-icon blue-icon"><Plus size={18}/></span><span><strong>Novi radni nalog</strong><small>Dodaj projekt u evidenciju</small></span><ChevronRight size={17}/></button><button onClick={()=>setActiveNav('Skladište')}><span className="quick-icon green-icon"><Package size={18}/></span><span><strong>Zaprimanje materijala</strong><small>Otvori skladište i dodaj novu zalihu</small></span><ChevronRight size={17}/></button><button onClick={()=>setActiveNav('Terenski rad')}><span className="quick-icon violet-icon"><Truck size={18}/></span><span><strong>Terenski nalog</strong><small>Pripremi montažu</small></span><ChevronRight size={17}/></button></div></article>
        </section>
        <footer className="footer"><span>© 2026 Kamen-app</span><span><ShieldCheck size={14}/> Poslovni podaci moraju ostati privatni</span><span>Verzija 0.2 · Evidencija poslovanja</span></footer>
      </div> : activeNav === 'Pametni nadzor' ? <OperationsMonitorModule onBack={()=>setActiveNav('Pregled')} /> : activeNav === 'Terenski rad' ? <FieldWorkModule onBack={()=>setActiveNav('Pregled')} /> : activeNav === 'Proizvodnja' ? <ProductionModule onBack={()=>setActiveNav('Pregled')} onCreateProject={()=>{setOpenWorkOrderOnEnter(true);setActiveNav('Radni nalozi')}} /> : activeNav === 'Korisnici i ovlasti' ? <AccessControlModule onBack={()=>setActiveNav('Pregled')} /> : activeNav === 'Alati i oprema' ? <ToolsModule onBack={()=>setActiveNav('Pregled')} /> : activeNav === 'Raspored' ? <ScheduleModule onBack={()=>setActiveNav('Pregled')} /> : activeNav === 'Dokumenti' ? <DocumentsModule onBack={()=>setActiveNav('Pregled')} /> : activeNav === 'Obavijesti' ? <NotificationsModule onBack={()=>setActiveNav('Pregled')} onNavigate={(destination)=>{setActiveNav(destination);setMobileNav(false)}} /> : <ModulePlaceholder name={activeNav} openCreate={openWorkOrderOnEnter} onCreateOpened={()=>setOpenWorkOrderOnEnter(false)} initialTab={openLowStockOnEnter?'Niske zalihe':undefined} onBack={()=>{setOpenLowStockOnEnter(false);try{setOrders(JSON.parse(window.localStorage.getItem('kamen-app-work-orders-v1')||'[]'));setInventory(JSON.parse(window.localStorage.getItem('kamen-app-materials-v1')||'[]'));setMachines(JSON.parse(window.localStorage.getItem('kamen-app-equipment-register-v1')||'[]'));}catch{}setActiveNav('Pregled')}} />}
    </main>
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
