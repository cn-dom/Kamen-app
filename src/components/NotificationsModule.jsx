import React,{useMemo,useState} from 'react';
import {ArrowLeft,Bell,Check,CheckCheck,AlertTriangle,Clock3,Package,Wrench,Factory,FileText,Filter} from 'lucide-react';
import {lowStockSuggestions} from '../lib/purchasing.js';
const READ_KEY='kamen-app-notification-read-v1';
const parse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const day=()=>new Date().toISOString().slice(0,10);
const addDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
function buildNotifications(){
 const today=day(),out=[];
 const push=(id,type,title,description,destination,severity='warning')=>out.push({id,type,title,description,destination,severity});
 const orders=parse('kamen-app-work-orders-v1',[]);
 orders.forEach(o=>{const status=o.status||o.stage||'';const due=o.dueDate||o.deadline||o.deliveryDate||o.date;
  if(['Zastoj','Blokirano','Blokiran'].includes(status))push('order-block-'+o.id,'blocked','Blokiran posao: '+(o.title||o.project||o.id),o.customer||'Potrebna je provjera razloga blokade.','Radni nalozi','high');
  if(due&&/^\d{4}-\d{2}-\d{2}$/.test(due)&&!['Završen','Otkazan','Isporučen'].includes(status)&&due<today)push('order-late-'+o.id,'deadline','Zakašnjeli rok: '+(o.title||o.project||o.id),'Rok '+due+' · '+(o.customer||'Kupac nije naveden'),'Radni nalozi','high');
  else if(due&&/^\d{4}-\d{2}-\d{2}$/.test(due)&&!['Završen','Otkazan','Isporučen'].includes(status)&&due>=today&&due<=addDays(today,3))push('order-soon-'+o.id,'deadline','Rok se približava: '+(o.title||o.project||o.id),'Rok '+due+' · '+(o.customer||'Kupac nije naveden'),'Radni nalozi','warning');
 });
 const inventory=parse('kamen-app-materials-v1',[]);
 lowStockSuggestions(inventory).forEach(x=>push('stock-'+x.id,'stock','Niska zaliha: '+(x.name||'Materijal'), 'Stanje '+x.currentQuantity+' '+(x.unit||'kom')+' · minimum '+x.minimumQuantity+' '+(x.unit||'kom'),'Nabava','high'));
 const tools=parse('kamen-app-tools-v1',[]),events=parse('kamen-app-tool-events-v1',[]);
 tools.filter(t=>t.status==='Zadužen').forEach(t=>{const ev=events.find(x=>x.id===t.currentIssueId&&!x.returnedAt);if(ev?.dueDate&&ev.dueDate<today)push('tool-late-'+t.id,'tool','Zakašnjeli povrat alata: '+t.name,'Zadužio '+(ev.person||'nije navedeno')+' · rok '+ev.dueDate,'Alati i oprema','high')});
 const maintenance=parse('kamen-app-equipment-register-v1',[]),maintEvents=parse('kamen-app-maintenance-events-v1',[]);
 maintenance.forEach(m=>{const due=m.nextServiceDate||m.nextMaintenanceDate;if(due&&due<=addDays(today,7)&&m.status!=='Otpisan')push('maintenance-'+m.id,'maintenance',due<today?'Kasni održavanje: ':'Uskoro održavanje: '+m.name,'Predviđeni datum '+due,'Održavanje strojeva',due<today?'high':'warning')});
 const stages=parse('kamen-app-production-stages-v1',{});
 Object.entries(stages.pieces||{}).forEach(([key,piece])=>Object.entries(piece.stages||{}).forEach(([stage,value])=>{if(value?.status==='Zastoj')push('stage-block-'+key+'-'+stage,'blocked','Zastoj u fazi: '+stage,key,'Proizvodnja','high')}));
 const field=parse('kamen-app-field-work-v1',[]);
 field.filter(x=>x.status==='Planirano'&&x.date===today).forEach(x=>push('field-today-'+x.id,'field','Današnji terenski posao: '+(x.project||x.customer||x.id),x.location||'Provjeri pripremu ekipe.','Terenski rad','info'));
 return out;
}
export default function NotificationsModule({onBack,onNavigate}){
 const [readIds,setReadIds]=useState(()=>parse(READ_KEY,[])),[filter,setFilter]=useState('Sve');
 const items=useMemo(()=>buildNotifications().map(x=>({...x,read:readIds.includes(x.id)})),[readIds]);
 const visible=items.filter(x=>filter==='Sve'||(filter==='Nepročitane'&&!x.read)||(filter==='Pročitane'&&x.read));
 const unread=items.filter(x=>!x.read).length;
 const mark=(id)=>{const next=[...new Set([...readIds,id])];localStorage.setItem(READ_KEY,JSON.stringify(next));setReadIds(next)};
 const markAll=()=>{const next=[...new Set([...readIds,...items.map(x=>x.id)])];localStorage.setItem(READ_KEY,JSON.stringify(next));setReadIds(next)};
 const icons={deadline:Clock3,blocked:AlertTriangle,stock:Package,tool:Wrench,maintenance:Wrench,field:Factory};
 return <div className="page-content module-page notifications-page">
  <section className="welcome-row module-welcome"><div><div className="eyebrow"><span className="live-dot"/> E-111 · OPERATIVNA UPOZORENJA</div><h1>Obavijesti <span className="count-pill">{unread} nepročitano</span></h1><p className="subtitle">Pregled rokova, blokada, zaliha, alata i poslova koji traže pažnju.</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={onBack}><ArrowLeft size={15}/> Povratak</button><button className="button button-primary" onClick={markAll} disabled={!unread}><CheckCheck size={16}/> Označi sve pročitano</button></div></section>
  <section className="panel notifications-panel"><div className="notifications-toolbar"><div className="tools-filter">{['Sve','Nepročitane','Pročitane'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><span>{items.length} aktivnih upozorenja</span></div>
   {visible.length?<div className="notification-list">{visible.map(item=>{const Icon=icons[item.type]||Bell;return <article className={'notification-item '+(!item.read?'unread':'')} key={item.id}><div className={'notification-icon '+item.severity}><Icon size={18}/></div><div className="notification-copy"><strong>{item.title}</strong><p>{item.description}</p><small>{item.type==='stock'?'Zalihe':item.type==='tool'?'Alati i oprema':item.type==='deadline'?'Rokovi':item.type==='blocked'?'Blokada':item.type==='maintenance'?'Održavanje':'Terenski rad'}</small></div><div className="notification-actions"><button className="button button-secondary" onClick={()=>{mark(item.id);onNavigate(item.destination)}}>Otvori zapis <span>→</span></button>{!item.read&&<button className="icon-button" onClick={()=>mark(item.id)} aria-label="Označi pročitano"><Check size={16}/></button>}</div></article>})}</div>:<div className="empty-state"><CheckCheck size={22}/><strong>{filter==='Nepročitane'?'Sve je pročitano':'Nema obavijesti'}</strong><span>Nova upozorenja pojavit će se kada poslovni podaci zatraže pažnju.</span></div>}
  </section>
  <div className="document-local-note"><Bell size={16}/> Obavijesti se izračunavaju iz lokalnih podataka pri otvaranju ovog ekrana. Ovo nisu push obavijesti i nema automatskog nadzora dok aplikacija nije otvorena.</div>
 </div>
}
