import React,{useMemo,useState} from 'react';
import {ArrowLeft,FileText,Upload,Download,Trash2,Search,Paperclip,ExternalLink,AlertTriangle,CheckCircle2} from 'lucide-react';
const KEY='kamen-app-documents-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
const TYPES=['Nacrt','Fotografija','Ponuda','Račun','Otpremnica','Radni nalog','Servis','Jamstvo','Ostalo'];
const MAX_SIZE=5*1024*1024;
const dateNow=()=>new Date().toISOString().slice(0,10);
const save=list=>localStorage.setItem(KEY,JSON.stringify(list));
export default function DocumentsModule({onBack}){
 const [items,setItems]=useState(read),[query,setQuery]=useState(''),[type,setType]=useState('Sve vrste'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [form,setForm]=useState({title:'',type:'Nacrt',date:dateNow(),author:'Vlasnik',relatedType:'Projekt / radni nalog',relatedId:'',notes:''});
 const [file,setFile]=useState(null);
 const visible=useMemo(()=>items.filter(x=>(type==='Sve vrste'||x.type===type)&&(!query||[x.title,x.type,x.author,x.relatedId,x.notes,x.fileName].join(' ').toLocaleLowerCase('hr').includes(query.toLocaleLowerCase('hr')))).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')),[items,type,query]);
 const persist=next=>{save(next);setItems(next)};
 async function add(e){e.preventDefault();setError('');setNotice('');
  if(!form.title.trim()){setError('Unesi naziv dokumenta.');return}
  if(!file){setError('Odaberi datoteku koju želiš priložiti.');return}
  if(file.size>MAX_SIZE){setError('Datoteka je veća od 5 MB. Odaberi manju datoteku.');return}
  try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Datoteku nije moguće pročitati.'));reader.readAsDataURL(file)});
   const item={id:'DOC-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title:form.title.trim(),type:form.type,date:form.date,author:form.author.trim()||'Nije navedeno',relatedType:form.relatedType,relatedId:form.relatedId.trim(),notes:form.notes.trim(),fileName:file.name,mimeType:file.type||'application/octet-stream',size:file.size,dataUrl,createdAt:new Date().toISOString()};
   persist([item,...items]);setForm({...form,title:'',relatedId:'',notes:''});setFile(null);document.getElementById('document-file-input')?.value='';setNotice('Dokument je spremljen u ovom pregledniku.');
  }catch(err){setError(err.message||'Spremanje nije uspjelo.')}
 }
 function download(item){const a=document.createElement('a');a.href=item.dataUrl;a.download=item.fileName||item.title;a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
 function remove(item){if(!confirm('Trajno ukloniti dokument „'+item.title+'“ iz ovog preglednika?'))return;persist(items.filter(x=>x.id!==item.id));setNotice('Dokument je uklonjen.')}
 const formatSize=n=>n<1024*1024?Math.max(1,Math.round(n/1024))+' KB':(n/1024/1024).toFixed(1)+' MB';
 return <div className="page-content module-page docs-page">
  <section className="welcome-row module-welcome"><div><div className="eyebrow"><span className="live-dot"/> E-110 · PRIVATNA EVIDENCIJA</div><h1>Dokumenti</h1><p className="subtitle">Priloži nacrte, fotografije, ponude i ostale datoteke te ih poveži s projektom ili kupcem.</p></div><button className="button button-secondary" onClick={onBack}><ArrowLeft size={15}/> Povratak</button></section>
  <section className="panel document-form-panel"><div className="panel-heading"><div><h2><Upload size={18}/> Dodaj dokument</h2><p>Podržane su datoteke do 5 MB po dokumentu.</p></div><span className="module-status">LOKALNA POHRANA</span></div>
   <form className="document-form" onSubmit={add}>
    <label>Naziv dokumenta<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Npr. Nacrt spomenika – obitelj Horvat" required/></label>
    <label>Vrsta<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Datum<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label>
    <label>Autor / odgovorna osoba<input value={form.author} onChange={e=>setForm({...form,author:e.target.value})} placeholder="Ime i prezime"/></label>
    <label>Povezano s<select value={form.relatedType} onChange={e=>setForm({...form,relatedType:e.target.value})}><option>Projekt / radni nalog</option><option>Kupac</option><option>Materijal / skladište</option><option>Stroj / alat</option><option>Općenito</option></select></label>
    <label>Oznaka ili naziv povezanog zapisa<input value={form.relatedId} onChange={e=>setForm({...form,relatedId:e.target.value})} placeholder="Npr. RN-2026-001 ili ime kupca"/></label>
    <label className="document-file-label">Datoteka<input id="document-file-input" type="file" onChange={e=>setFile(e.target.files?.[0]||null)} required/><small>{file?file.name+' · '+formatSize(file.size):'Odaberi PDF, sliku ili drugi dokument (do 5 MB)'}</small></label>
    <label className="document-notes">Napomena<textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Dodatne informacije..."/></label>
    <div className="document-submit"><button className="button button-primary" type="submit"><Upload size={16}/> Spremi dokument</button></div>
   </form>
  </section>
  <section className="panel document-list-panel"><div className="panel-heading"><div><h2>Arhiva dokumenata <span className="count-pill">{items.length}</span></h2><p>Pretraži i otvori datoteke povezane s poslovima.</p></div></div>
   <div className="document-toolbar"><div className="search-wrap"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Traži naziv, kupca, oznaku..."/></div><select value={type} onChange={e=>setType(e.target.value)}><option>Sve vrste</option>{TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
   {visible.length?<div className="document-list">{visible.map(item=><article className="document-row" key={item.id}><div className="document-type-icon"><FileText size={20}/></div><div className="document-copy"><strong>{item.title}</strong><span>{item.type} · {item.date} · {item.author}</span><small>{item.relatedType}{item.relatedId?' · '+item.relatedId:''} · {item.fileName} · {formatSize(item.size)}</small>{item.notes&&<p>{item.notes}</p>}</div><div className="document-actions"><button className="button button-secondary" onClick={()=>download(item)}><Download size={15}/> Preuzmi</button><button className="icon-button" onClick={()=>remove(item)} aria-label={'Ukloni '+item.title}><Trash2 size={16}/></button></div></article>)}</div>:<div className="empty-state"><Paperclip size={22}/><strong>{items.length?'Nema rezultata pretrage':'Arhiva je još prazna'}</strong><span>{items.length?'Promijeni filtar ili pojam pretrage.':'Dodaj prvi nacrt, fotografiju ili poslovni dokument.'}</span></div>}
  </section>
  <div className="document-local-note"><AlertTriangle size={16}/> Datoteke se čuvaju u memoriji ovog preglednika. Nisu poslane na poslužitelj niti su dostupne na drugim uređajima. Izradi sigurnosnu kopiju redovito; ukupni prostor preglednika je ograničen.</div>
  {notice&&<div className="module-notice"><CheckCircle2 size={17}/>{notice}</div>}{error&&<div className="module-notice backup-error"><AlertTriangle size={17}/>{error}</div>}
 </div>
}
