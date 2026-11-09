import React, { useRef, useState } from 'react';
import { DEFAULT_COMPANY_SETTINGS, normalizeCompanySettings, validateCompanyProfile, validateCompanyWorkRules, calculateNetShiftMinutes } from '../lib/companySettings.js';
import { ArrowLeft, Building2, CheckCircle2, Clock3, MapPin, Plus, Settings2, Upload, X } from 'lucide-react';

const PROFILE_KEY = 'kamen-app-company-profile-v1';
const SETTINGS_KEY = 'kamen-app-company-settings-v1';
const AUDIT_KEY = 'kamen-app-settings-audit-v1';
const read = (key, fallback) => { try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const field = (label, key, value, onChange, props = {}) => <label>{label}<input value={value ?? ''} onChange={event => onChange(key, event.target.value)} {...props}/></label>;

export default function SettingsModule({ onBack }) {
  const [profile, setProfile] = useState(() => ({ name: '', address: '', city: '', oib: '', phone: '', email: '', iban: '', website: '', logoDataUrl: '', ...read(PROFILE_KEY, {}) }));
  const [settings, setSettings] = useState(() => normalizeCompanySettings(read(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)));
  const [audit, setAudit] = useState(() => read(AUDIT_KEY, []));
  const [tab, setTab] = useState('company');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const logoRef = useRef(null);
  const tabs = [{ id: 'company', label: 'Profil tvrtke', icon: Building2 }, { id: 'warehouse', label: 'Skladište', icon: MapPin }, { id: 'rules', label: 'Pravila rada', icon: Clock3 }];
  const recordChange = (action, details) => ({ id: 'SET-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), action, details, createdAt: new Date().toISOString() });
  const save = (nextProfile = profile, nextSettings = settings, action = 'Spremanje postavki') => {
    setMessage(''); setError('');
    const profileIssue = validateCompanyProfile(nextProfile);
    const rulesIssue = validateCompanyWorkRules(nextSettings.workRules);
    if (profileIssue || rulesIssue) { setError(profileIssue || rulesIssue); return; }
    const nextAudit = [recordChange(action, nextProfile.name || 'Postavke tvrtke'), ...audit].slice(0, 300);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(nextAudit));
      setProfile(nextProfile); setSettings(nextSettings); setAudit(nextAudit);
      setMessage('Postavke su spremljene u ovom pregledniku.');
    } catch {
      setError('Spremanje nije uspjelo. Provjeri slobodan prostor preglednika.');
    }
  };
  const updateProfile = (key, value) => setProfile(current => ({ ...current, [key]: value }));
  const updateRule = (key, value) => setSettings(current => ({ ...current, workRules: { ...current.workRules, [key]: value } }));
  const updateList = (key, next) => setSettings(current => ({ ...current, [key]: next }));
  const addToList = (key, value, clear) => {
    const clean = value.trim();
    if (!clean) return;
    if (settings[key].some(item => item.toLocaleLowerCase('hr') === clean.toLocaleLowerCase('hr'))) { setError('Ta stavka već postoji.'); return; }
    updateList(key, [...settings[key], clean]); clear(''); setError(''); setMessage('Nova stavka dodana. Pritisni Spremi promjene da je trajno spremiš.');
  };
  const uploadLogo = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Odaberi slikovnu datoteku.'); event.target.value = ''; return; }
    if (file.size > 1024 * 1024) { setError('Logotip mora biti manji od 1 MB.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { updateProfile('logoDataUrl', String(reader.result || '')); setMessage('Logotip je učitan. Pritisni Spremi promjene.'); setError(''); };
    reader.onerror = () => setError('Datoteku logotipa nije moguće pročitati.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  const profileFields = [
    ['Naziv tvrtke / obrta', 'name'], ['Adresa', 'address'], ['Mjesto i poštanski broj', 'city'],
    ['OIB', 'oib'], ['Telefon', 'phone'], ['E-mail', 'email'], ['IBAN', 'iban'], ['Web-stranica', 'website']
  ];
  const profileIssue = validateCompanyProfile(profile);
  const profileValid = !profileIssue;
  const rules = settings.workRules;
  const workMinutes = calculateNetShiftMinutes(rules) + Number(rules.breakMinutes || 0);
  return <div className="page-content module-page company-settings-page">
    <section className="welcome-row module-welcome"><div><div className="eyebrow"><span className="live-dot"/> ADMINISTRACIJA · POSTAVKE TVRTKE</div><h1>Postavke tvrtke</h1><p className="subtitle">Uredi podatke tvrtke, skladišne šifrarnike i osnovna pravila rada.</p></div><button className="button button-secondary" onClick={onBack}><ArrowLeft size={15}/> Povratak na pregled</button></section>
    <div className="access-warning"><Settings2 size={18}/><div><strong>Lokalne postavke</strong><p>Promjene se trenutačno spremaju u ovaj preglednik. Primjenjuju se na lokalne module na ovom uređaju; sinkronizacija i stvarne korisničke ovlasti dolaze u završnoj backend fazi.</p></div></div>
    <nav className="settings-tabs" aria-label="Postavke tvrtke">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon size={16}/>{item.label}</button>)}</nav>
    {tab === 'company' && <section className="panel settings-panel">
      <div className="panel-heading"><div><h2>Podaci tvrtke</h2><p>Ovi podaci koriste se na ponudama i u poslovnim dokumentima.</p></div><Building2 size={20}/></div>
      <div className="settings-logo-row"><div className="settings-logo-preview">{profile.logoDataUrl ? <img src={profile.logoDataUrl} alt="Logotip tvrtke"/> : <Building2 size={25}/>}</div><div><strong>Logotip tvrtke</strong><p>PNG, JPG ili WEBP · najviše 1 MB. Čuva se lokalno u ovom pregledniku.</p><div className="settings-inline-actions"><button type="button" className="button button-secondary" onClick={() => logoRef.current?.click()}><Upload size={14}/> Odaberi logotip</button>{profile.logoDataUrl && <button type="button" className="button button-secondary" onClick={() => updateProfile('logoDataUrl', '')}><X size={14}/> Ukloni</button>}</div><input ref={logoRef} type="file" accept="image/*" hidden onChange={uploadLogo}/></div></div>
      <div className="settings-form-grid">{profileFields.map(([label, key]) => field(label, key, profile[key], updateProfile, key === 'email' ? { type: 'email' } : key === 'oib' ? { inputMode: 'numeric', maxLength: 11, placeholder: '11 znamenki' } : {}))}</div>
      {profileIssue && <p className="settings-error">{profileIssue}</p>}
      <div className="settings-actions"><button className="button button-primary" disabled={!profileValid} onClick={() => save(profile, settings, 'Promjena profila tvrtke')}><CheckCircle2 size={15}/> Spremi podatke tvrtke</button></div>
    </section>}
    {tab === 'warehouse' && <section className="settings-config-grid">
      {[{key:'locations',title:'Skladišne lokacije',desc:'Mjesta na kojima se čuvaju ploče, komadi i ostatci.',value:newLocation,set:setNewLocation,placeholder:'Npr. Stalak D1',icon:MapPin},{key:'materialTypes',title:'Vrste materijala',desc:'Pojmovi za brži unos i ujednačenu evidenciju materijala.',value:newType,set:setNewType,placeholder:'Npr. Kvarcit',icon:Building2},{key:'units',title:'Jedinice mjere',desc:'Jedinice koje se nude pri unosu zaliha.',value:newUnit,set:setNewUnit,placeholder:'Npr. paket',icon:Settings2}].map(group => <article className="panel settings-list-card" key={group.key}><div className="panel-heading"><div><h2>{group.title}</h2><p>{group.desc}</p></div><group.icon size={19}/></div><form className="settings-add-row" onSubmit={event => { event.preventDefault(); addToList(group.key, group.value, group.set); }}><input value={group.value} onChange={event => group.set(event.target.value)} placeholder={group.placeholder} aria-label={group.title}/><button className="button button-secondary" type="submit"><Plus size={14}/> Dodaj</button></form><div className="settings-chip-list">{settings[group.key].map(item => <span className="settings-chip" key={item}>{item}<button type="button" onClick={() => updateList(group.key, settings[group.key].filter(value => value !== item))} aria-label={'Ukloni ' + item}><X size={13}/></button></span>)}</div></article>)}
      <div className="settings-save-strip"><span>Popisi se koriste kao prijedlozi pri unosu skladišnih stavki.</span><button className="button button-primary" onClick={() => save(profile, settings, 'Promjena skladišnih šifrarnika')}><CheckCircle2 size={15}/> Spremi promjene</button></div>
    </section>}
    {tab === 'rules' && <section className="panel settings-panel"><div className="panel-heading"><div><h2>Pravila rada i obračuna</h2><p>Osnovne vrijednosti za planiranje i buduće obračune. Ne stvaraju automatski obračun plaće.</p></div><Clock3 size={20}/></div>
      <div className="settings-form-grid">{field('Početak smjene','workStart',rules.workStart,updateRule,{type:'time'})}{field('Završetak smjene','workEnd',rules.workEnd,updateRule,{type:'time'})}{field('Trajanje pauze (minute)','breakMinutes',rules.breakMinutes,updateRule,{type:'number',min:0,max:240})}{field('Trošak rada po satu (€)','hourlyCostRate',rules.hourlyCostRate,updateRule,{type:'number',min:0,step:'0.01'})}{field('Trošak prijevoza po km (€)','travelCostPerKm',rules.travelCostPerKm,updateRule,{type:'number',min:0,step:'0.01'})}{field('Koeficijent prekovremenog rada','overtimeMultiplier',rules.overtimeMultiplier,updateRule,{type:'number',min:1,max:3,step:'0.1'})}</div>
      <div className="settings-rule-checks"><label><input type="checkbox" checked={Boolean(rules.requireWriteoffReason)} onChange={event => updateRule('requireWriteoffReason', event.target.checked)}/> Obvezan razlog za otpis materijala</label><label><input type="checkbox" checked={Boolean(rules.requireStocktakeApproval)} onChange={event => updateRule('requireStocktakeApproval', event.target.checked)}/> Zahtijevaj odobrenje inventurne korekcije</label></div>
      <div className="settings-rule-summary"><strong>Informativni pregled smjene</strong><span>{workMinutes > 0 ? calculateNetShiftMinutes(rules) : '—'} minuta rada nakon pauze</span></div>
      <div className="settings-actions"><button className="button button-primary" onClick={() => save(profile, settings, 'Promjena pravila rada')}><CheckCircle2 size={15}/> Spremi pravila</button></div>
    </section>}
    {message && <div className="module-notice backup-message"><CheckCircle2 size={16}/>{message}</div>}
    {error && <div className="module-notice backup-error">{error}</div>}
    <section className="panel settings-history"><div className="panel-heading"><div><h2>Povijest promjena postavki</h2><p>Lokalni zapis promjena, najnovije na vrhu.</p></div><span className="count-pill">{audit.length}</span></div>{audit.length ? audit.slice(0,20).map(item => <div className="settings-history-row" key={item.id}><span><strong>{item.action}</strong><small>{item.details}</small></span><time>{new Date(item.createdAt).toLocaleString('hr-HR')}</time></div>) : <div className="empty-state">Još nema evidentiranih promjena.</div>}</section>
    <div className="backup-footnote"><Settings2 size={15}/> Postavke su lokalne i nisu sigurnosna granica. U završnoj fazi povezat će se s tvrtkom i njezinim korisničkim računima.</div>
  </div>;
}
