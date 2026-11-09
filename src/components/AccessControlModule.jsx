import React,{useMemo,useState} from 'react';
import {Activity,ArrowLeft,Check,CircleAlert,ClipboardList,LockKeyhole,Plus,ShieldCheck,Trash2,Users} from 'lucide-react';
import {ACCESS_PERMISSIONS,ACCESS_ROLES,createAccessAuditEntry,defaultOwnerMember,getMemberPermissions,normalizeTeamMembers} from '../lib/access-control.js';
const MEMBERS_KEY='kamen-app-team-members-v1',AUDIT_KEY='kamen-app-access-audit-v1';
const read=(key,fallback)=>{try{return JSON.parse(window.localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const write=(key,value)=>window.localStorage.setItem(key,JSON.stringify(value));
export default function AccessControlModule({onBack}){
 const [members,setMembers]=useState(()=>normalizeTeamMembers(read(MEMBERS_KEY,[defaultOwnerMember()])));
 const [audit,setAudit]=useState(()=>read(AUDIT_KEY,[]));
 const [selectedId,setSelectedId]=useState('local-owner'),[name,setName]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState('worker');
 const [previewId,setPreviewId]=useState('local-owner'),[message,setMessage]=useState(''),[error,setError]=useState('');
 const selected=members.find(item=>item.id===selectedId),preview=members.find(item=>item.id===previewId)||members[0];
 const previewPermissions=useMemo(()=>new Set(getMemberPermissions(preview)),[preview]);
 const grouped=ACCESS_PERMISSIONS.reduce((acc,item)=>{(acc[item.group] ||= []).push(item);return acc},{});
 const saveAll=(next,action,targetId,details)=>{
  const entry=createAccessAuditEntry({action,targetId,details}),nextAudit=[entry,...audit].slice(0,300);
  try{write(MEMBERS_KEY,next);write(AUDIT_KEY,nextAudit);setMembers(next);setAudit(nextAudit);setMessage('Promjene su spremljene u ovom pregledniku.');setError('')}
  catch{setError('Spremanje nije uspjelo. Provjeri slobodan prostor preglednika.')}
 };
 const addMember=event=>{
  event.preventDefault();if(!name.trim()){setError('Upiši ime člana tima.');return}
  const member={id:'local-'+Date.now(),name:name.trim(),email:email.trim(),role,active:true,overrides:{},createdAt:new Date().toISOString()};
  saveAll([...members,member],'Dodavanje člana',member.id,member.name+' · '+ACCESS_ROLES[role].label);
  setName('');setEmail('');setSelectedId(member.id);
 };
 const updateMember=patch=>{
  if(!selected||selected.isLocalProfile){setError('Lokalni profil vlasnika ne može se ukloniti ni degradirati.');return}
  saveAll(members.map(item=>item.id===selected.id?{...item,...patch}:item),'Promjena člana ili ovlasti',selected.id,selected.name);
 };
 const togglePermission=key=>{
  if(!selected||selected.isLocalProfile){setError('Ovlasti osnovnog lokalnog profila vlasnika su fiksne.');return}
  const baseHas=getMemberPermissions({...selected,overrides:{}}).includes(key),currentHas=getMemberPermissions(selected).includes(key),overrides={...(selected.overrides||{})};
  if(currentHas===!baseHas)delete overrides[key];else overrides[key]=!currentHas;
  updateMember({overrides});
 };
 const removeMember=()=>{
  if(!selected||selected.isLocalProfile||!window.confirm('Ukloniti člana '+selected.name+' iz lokalnog popisa? Povijest promjena ostaje.'))return;
  saveAll(members.filter(item=>item.id!==selected.id),'Uklanjanje člana',selected.id,selected.name);setSelectedId('local-owner');
 };
 const activeCount=members.filter(item=>item.active).length;
 return <div className="page-content module-page access-page">
  <section className="welcome-row module-welcome"><div><div className="eyebrow"><span className="live-dot"/> ADMINISTRACIJA · PRIPREMA ZA VIŠEKORISNIČKI RAD</div><h1>Korisnici i ovlasti</h1><p className="subtitle">Pripremi tim, uloge i pravila pristupa prije povezivanja zajedničke baze.</p></div><button className="button button-secondary" onClick={onBack}><ArrowLeft size={15}/> Povratak na pregled</button></section>
  <div className="access-warning"><LockKeyhole size={18}/><div><strong>Lokalni demonstracijski način rada</strong><p>Ovdje uređuješ lokalni popis članova i simuliraš ovlasti. Nema stvarnih računa, prijave, poslužiteljske provjere ni sinkronizacije. Skrivena ili onemogućena radnja nije sigurnosna zaštita.</p></div></div>
  <section className="access-stats"><article className="panel access-stat"><Users size={19}/><div><strong>{members.length}</strong><span>Članova u lokalnom popisu</span></div></article><article className="panel access-stat"><Check size={19}/><div><strong>{activeCount}</strong><span>Aktivnih profila</span></div></article><article className="panel access-stat"><Activity size={19}/><div><strong>{audit.length}</strong><span>Lokalnih zapisa promjena</span></div></article></section>
  <section className="access-layout">
   <article className="panel access-members"><div className="panel-heading"><div><h2>Članovi tima</h2><p>Dodaj zaposlenike i dodijeli im početnu ulogu.</p></div><span className="count-pill">{members.length}</span></div>
    <form className="access-add-form" onSubmit={addMember}><label>Ime i prezime<input value={name} onChange={e=>setName(e.target.value)} placeholder="Npr. Ivan Horvat" maxLength={80}/></label><label>E-pošta (opcionalno)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ime@tvrtka.hr" maxLength={120}/></label><label>Početna uloga<select value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(ACCESS_ROLES).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label><button className="button button-primary" type="submit"><Plus size={15}/> Dodaj člana</button></form>
    <div className="access-member-list">{members.map(member=><button key={member.id} className={'access-member '+(selectedId===member.id?'selected':'')} onClick={()=>{setSelectedId(member.id);setError('');setMessage('')}}><span className="access-avatar">{member.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><span className="access-member-copy"><strong>{member.name}</strong><small>{ACCESS_ROLES[member.role].label} · {member.active?'Aktivan':'Neaktivan'}</small></span><span className={'access-status '+(member.active?'is-active':'')}/></button>)}</div>
   </article>
   <div className="access-detail-column">
    <article className="panel access-detail"><div className="panel-heading"><div><h2>Postavke člana</h2><p>Uredi ulogu i dodatne ovlasti odabranog člana.</p></div><ShieldCheck size={20}/></div>
     {selected?<><div className="access-selected-name"><div><strong>{selected.name}</strong><small>{selected.email||'E-pošta nije unesena'}</small></div>{!selected.isLocalProfile&&<button className="icon-button access-delete" onClick={removeMember} aria-label="Ukloni člana"><Trash2 size={16}/></button>}</div>
      <div className="access-field-row"><label>Uloga<select value={selected.role} disabled={selected.isLocalProfile} onChange={e=>updateMember({role:e.target.value,overrides:{}})}>{Object.entries(ACCESS_ROLES).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label><label>Status<select value={selected.active?'active':'inactive'} disabled={selected.isLocalProfile} onChange={e=>updateMember({active:e.target.value==='active'})}><option value="active">Aktivan</option><option value="inactive">Neaktivan</option></select></label></div>
      <div className="access-permission-list">{Object.entries(grouped).map(([group,items])=><div className="access-permission-group" key={group}><h3>{group}</h3>{items.map(item=>{const enabled=getMemberPermissions(selected).includes(item.key);return <label className="access-permission" key={item.key}><span><strong>{item.label}</strong><small>{enabled?'Dopušteno':'Nije dopušteno'}</small></span><input type="checkbox" checked={enabled} disabled={selected.isLocalProfile} onChange={()=>togglePermission(item.key)}/></label>})}</div>)}</div>
     </>:<div className="empty-state">Odaberi člana tima.</div>}
    </article>
    <article className="panel access-preview"><div className="panel-heading"><div><h2>Pregled uloge</h2><p>Provjeri koje su mogućnosti dodijeljene profilu.</p></div><ClipboardList size={19}/></div><label>Prikaži kao<select value={previewId} onChange={e=>setPreviewId(e.target.value)}>{members.map(item=><option key={item.id} value={item.id}>{item.name} · {ACCESS_ROLES[item.role].label}</option>)}</select></label><div className="access-preview-grid">{ACCESS_PERMISSIONS.map(item=><div key={item.key} className={'access-preview-item '+(previewPermissions.has(item.key)?'allowed':'denied')}><span>{item.label}</span><strong>{previewPermissions.has(item.key)?'Dopušteno':'Nije dopušteno'}</strong></div>)}</div><small className="access-preview-note">Ovaj pregled služi planiranju. Ne blokira stvarne module niti štiti podatke u lokalnoj pohrani.</small></article>
   </div>
  </section>
  <section className="panel access-audit"><div className="panel-heading"><div><h2>Povijest promjena ovlasti</h2><p>Lokalna evidencija dodavanja, uklanjanja i promjena članova.</p></div><span className="count-pill">{audit.length}</span></div>{audit.length?<div className="access-audit-list">{audit.slice(0,30).map(entry=><div className="access-audit-row" key={entry.id}><span className="access-audit-dot"/><div><strong>{entry.action}</strong><p>{entry.details||entry.targetId}</p></div><time>{new Date(entry.createdAt).toLocaleString('hr-HR')}</time></div>)}</div>:<div className="empty-state"><CircleAlert size={20}/><strong>Nema promjena</strong><span>Promjene članova i ovlasti pojavit će se ovdje.</span></div>}</section>
  {(message||error)&&<div className={'module-notice '+(error?'backup-error':'backup-message')}>{error||message}</div>}
  <div className="backup-footnote"><LockKeyhole size={15}/> Pravi računi, potvrda identiteta, izolacija tvrtki i sinkronizacija uvode se u završnoj fazi povezivanja backenda.</div>
 </div>;
}
